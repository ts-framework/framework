import { Injectable, TiedContainerDispatcher } from '@baileyherbert/container';
import { IAttribute, IAttributeInstance, ReflectionClass, ReflectionMethod } from '@baileyherbert/reflection';
import { Constructor } from '@baileyherbert/types';
import { Application } from '../../application/Application';
import { Controller } from '../../controllers/Controller';
import { Service } from '../Service';

class AttributeRegistryImpl {

	protected attributes = new Map<IAttribute<any>, AttributeRegistration>();

	/**
	 * Registers the given attribute as a managed service attribute.
	 * @param attribute
	 */
	public register(attribute: IAttribute<any>) {
		if (this.attributes.has(attribute)) {
			return;
		}

		this.attributes.set(attribute, {
			classes: new Map(),
			methods: new Map(),
			parameters: new Map(),
			properties: new Map()
		});

		const registration = this.attributes.get(attribute)!;

		/**
		 * Record class attachments.
		 */
		attribute.events.on('classAttached', (constructor, attribute) => {
			if (!registration.classes.has(constructor)) {
				registration.classes.set(constructor, new Set());
			}

			registration.classes.get(constructor)!.add(attribute);
			Injectable(constructor);
		});

		/**
		 * Record method attachments.
		 */
		attribute.events.on('methodAttached', (prototype, methodName, descriptor, attribute) => {
			if (!registration.methods.has(prototype)) {
				registration.methods.set(prototype, new Map());
			}

			if (!registration.methods.get(prototype)!.has(methodName)) {
				registration.methods.get(prototype)!.set(methodName, new Set());
			}

			registration.methods.get(prototype)!.get(methodName)!.add(attribute);
			Injectable(prototype, methodName, descriptor);
		});

		/**
		 * Record property attachments.
		 */
		attribute.events.on('propertyAttached', (prototype, propertyName, attribute) => {
			if (!registration.properties.has(prototype)) {
				registration.properties.set(prototype, new Map());
			}

			if (!registration.properties.get(prototype)!.has(propertyName)) {
				registration.properties.get(prototype)!.set(propertyName, new Set());
			}

			registration.properties.get(prototype)!.get(propertyName)!.add(attribute);
		});

		/**
		 * Record parameter attachments.
		 */
		attribute.events.on('parameterAttached', (prototype, methodName, parameterIndex, attribute) => {
			if (!registration.parameters.has(prototype)) {
				registration.parameters.set(prototype, new Map());
			}

			if (!registration.parameters.get(prototype)!.has(methodName)) {
				registration.parameters.get(prototype)!.set(methodName, new Map());
			}

			if (!registration.parameters.get(prototype)!.get(methodName)!.has(parameterIndex)) {
				registration.parameters.get(prototype)!.get(methodName)!.set(parameterIndex, new Set());
			}

			registration.parameters.get(prototype)!.get(methodName)!.get(parameterIndex)!.add(attribute);
		});
	}

	/**
	 * Returns all classes in the application which have the specified service attribute applied.
	 * @param application
	 * @param attribute
	 * @returns
	 */
	public getClasses<A extends IAttribute<any>>(application: Application, attribute: A): AttributeClassRegistration<A>[] {
		if (!this.attributes.has(attribute)) {
			throw new Error(
				`Cannot get attribute classes: ` +
				`The attribute provided was not created with Attribute.create().`
			);
		}

		const registration = this.attributes.get(attribute)!;
		const classes = new Array<AttributeClassRegistration<A>>();
		const types = new Set([
			...application.services.getAll(),
			...application.controllers.getAll()
		]);

		for (const [type, attributes] of registration.classes) {
			if (types.has(type)) {
				const reflection = new ReflectionClass(type);
				const target = application.container.resolve(type);
				const attributesArr = [...attributes] as any[];

				classes.push({
					target,
					reflection,
					attributes: attributesArr,
					first() { return attributesArr[attributesArr.length - 1] },
					last() { return attributesArr[0] }
				});
			}
		}

		return classes;
	}

	/**
	 * Returns all methods in the application which have the specified service attribute applied.
	 * @param application
	 * @param attribute
	 */
	public getMethods<A extends IAttribute<any>>(application: Application, attribute: A): AttributeMethodRegistration<A>[] {
		if (!this.attributes.has(attribute)) {
			throw new Error(
				`Cannot get attribute classes: ` +
				`The attribute provided was not created with Attribute.create().`
			);
		}

		const registration = this.attributes.get(attribute)!;
		const methods = new Array<AttributeMethodRegistration<A>>();
		const prototypes = new Set([
			...application.services.getAll().map(o => o.prototype),
			...application.controllers.getAll().map(o => o.prototype)
		]);

		for (const [prototype, methodsMap] of registration.methods) {
			if (prototypes.has(prototype)) {
				for (const [methodName, attributes] of methodsMap) {
					const ref = new ReflectionClass(prototype.constructor);
					const method = ref.getMethod(methodName)!;
					const target = application.container.resolve(prototype.constructor);
					const attributesArr = [...attributes] as any[];

					methods.push({
						target,
						methodName,
						attributes: attributesArr,
						reflection: method,
						dispatcher: application.container.createTiedDispatcher(target, methodName),
						first() { return attributesArr[attributesArr.length - 1] },
						last() { return attributesArr[0] }
					});
				}
			}
		}

		return methods;
	}

}

/**
 * The global attribute registry.
 */
export const AttributeRegistry = new AttributeRegistryImpl();

interface AttributeRegistration {
	classes: AttributeClassMap;
	methods: AttributeMethodMap;
	properties: AttributePropertyMap;
	parameters: AttributeParameterMap;
}

type AttributeSet = Set<IAttributeInstance<any>>;
type AttributeClassMap = Map<Constructor<any>, AttributeSet>;
type AttributeMethodMap = Map<Object, Map<string, AttributeSet>>;
type AttributePropertyMap = Map<Object, Map<string, AttributeSet>>;
type AttributeParameterMap = Map<Object, Map<string, Map<number, AttributeSet>>>;

export interface AttributeMethodRegistration<A extends IAttribute<any>> {
	/**
	 * The instance of the controller or service where this method is defined.
	 */
	target: Service | Controller;

	/**
	 * The name of the method.
	 */
	methodName: string;

	/**
	 * A reflection instance for the target method.
	 */
	reflection: ReflectionMethod<Service | Controller>;

	/**
	 * The attribute instances that were applied to the method.
	 */
	attributes: IAttributeInstance<A>[];

	/**
	 * A dispatcher used to execute the method with dependency injection.
	 */
	dispatcher: TiedContainerDispatcher;

	/**
	 * Returns the first attribute instance on the method.
	 */
	first(): IAttributeInstance<A>;

	/**
	 * Returns the last attribute instance on the method.
	 */
	last(): IAttributeInstance<A>;
}

export interface AttributeClassRegistration<A extends IAttribute<any>> {
	/**
	 * The instance of the controller or service that the attribute was applied to.
	 */
	target: Service | Controller;

	/**
	 * A reflection instance for the target class.
	 */
	reflection: ReflectionClass<Service | Controller>;

	/**
	 * The attribute instances that were applied to the class.
	 */
	attributes: IAttributeInstance<A>[];

	/**
	 * Returns the first attribute instance on the class.
	 */
	first(): IAttributeInstance<A>;

	/**
	 * Returns the last attribute instance on the class.
	 */
	last(): IAttributeInstance<A>;
}
