import { Injectable } from '@baileyherbert/container';
import { NestedSet } from '@baileyherbert/nested-collections';
import { IAttribute, IAttributeInstance, ReflectionClass } from '@baileyherbert/reflection';
import { Constructor } from '@baileyherbert/types';
import { Application } from '../../application/Application';
import { ClassAttributeRegistration } from './registration/ClassAttributeRegistration';
import { MethodAttributeRegistration } from './registration/MethodAttributeRegistration';
import { ParameterAttributeRegistration } from './registration/ParameterAttributeRegistration';
import { PropertyAttributeRegistration } from './registration/PropertyAttributeRegistration';

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
			classes: new NestedSet(),
			methods: new NestedSet(),
			parameters: new NestedSet(),
			properties: new NestedSet()
		});

		const registration = this.attributes.get(attribute)!;

		/**
		 * Record class attachments.
		 */
		attribute.events.on('classAttached', (constructor, attribute) => {
			registration.classes.add([constructor], attribute);
			Injectable(constructor);
		});

		/**
		 * Record method attachments.
		 */
		attribute.events.on('methodAttached', (prototype, methodName, descriptor, attribute) => {
			registration.methods.add([prototype, methodName], attribute);
			Injectable(prototype, methodName, descriptor);
		});

		/**
		 * Record property attachments.
		 */
		attribute.events.on('propertyAttached', (prototype, propertyName, attribute) => {
			registration.properties.add([prototype, propertyName], attribute);
		});

		/**
		 * Record parameter attachments.
		 */
		attribute.events.on('parameterAttached', (prototype, methodName, parameterIndex, attribute) => {
			registration.parameters.add([prototype, methodName, parameterIndex], attribute);
		});
	}

	/**
	 * Returns all classes in the application which have the specified service attribute applied.
	 * @param application
	 * @param attribute
	 * @returns
	 */
	public getClasses<A extends IAttribute<any>>(application: Application, attribute: A) {
		const registration = this.getAttributeRegistration(attribute);
		const classes = new Array<ClassAttributeRegistration<A>>();
		const constructors = this.getApplicationConstructors(application);

		for (const constructor of constructors) {
			if (registration.classes.hasKey([constructor])) {
				const attributes = [...registration.classes.get([constructor])!];
				const reflection = new ReflectionClass(constructor);

				classes.push(new ClassAttributeRegistration(
					application,
					attributes,
					reflection
				));
			}
		}

		return classes;
	}

	/**
	 * Returns all methods in the application which have the specified service attribute applied.
	 * @param application
	 * @param attribute
	 */
	public getMethods<A extends IAttribute<any>>(application: Application, attribute: A) {
		const registration = this.getAttributeRegistration(attribute);
		const methods = new Array<MethodAttributeRegistration<A>>();
		const prototypes = this.getApplicationPrototypes(application);

		for (const prototype of prototypes) {
			if (registration.methods.hasKey([prototype])) {
				const reflection = new ReflectionClass(prototype.constructor);

				for (const [methodName, set] of registration.methods.get([prototype])!) {
					const method = reflection.getMethod(methodName)!;
					const attributes = [...set];

					methods.push(new MethodAttributeRegistration(
						application,
						attributes,
						method
					));
				}
			}
		}

		return methods;
	}

	/**
	 * Returns all parameters in the application which have the specified service attribute applied.
	 * @param application
	 * @param attribute
	 */
	public getParameters<A extends IAttribute<any>>(application: Application, attribute: A) {
		const registration = this.getAttributeRegistration(attribute);
		const parameters = new Array<ParameterAttributeRegistration<A>>();
		const prototypes = this.getApplicationPrototypes(application);

		for (const prototype of prototypes) {
			if (registration.parameters.hasKey([prototype])) {
				const reflection = new ReflectionClass(prototype.constructor);

				for (const [methodName, indices] of registration.parameters.get([prototype])!) {
					for (const [index, set] of indices) {
						const parameter = reflection.getMethod(methodName)?.getParameter(index)!;
						const attributes = [...set];

						parameters.push(new ParameterAttributeRegistration(
							application,
							attributes,
							parameter
						));
					}
				}
			}
		}

		return parameters;
	}

	/**
	 * Returns all properties in the application which have the specified service attribute applied.
	 * @param application
	 * @param attribute
	 */
	public getProperties<A extends IAttribute<any>>(application: Application, attribute: A) {
		const registration = this.getAttributeRegistration(attribute);
		const properties = new Array<PropertyAttributeRegistration<A>>();
		const prototypes = this.getApplicationPrototypes(application);

		for (const prototype of prototypes) {
			if (registration.properties.hasKey([prototype])) {
				const reflection = new ReflectionClass(prototype.constructor);

				for (const [propName, set] of registration.properties.get([prototype])!) {
					const property = reflection.getProperty(propName)!;
					const attributes = [...set];

					properties.push(new PropertyAttributeRegistration(
						application,
						attributes,
						property
					));
				}
			}
		}

		return properties;
	}

	/**
	 * Returns the registration for the given attribute or throws an error if it's not found in the registry.
	 * @param attribute
	 * @returns
	 */
	private getAttributeRegistration<A extends IAttribute<any>>(attribute: A) {
		if (!this.attributes.has(attribute)) {
			throw new Error(
				`Cannot get attribute classes: ` +
				`The attribute provided was not created with Attribute.create().`
			);
		}

		return this.attributes.get(attribute)!;
	}

	/**
	 * Returns a set containing all of the given application's prototypes for services and controllers.
	 * @param application
	 * @returns
	 */
	private getApplicationPrototypes(application: Application): Set<Object> {
		return new Set([
			...application.services.getAll().map(o => o.prototype),
			...application.controllers.getAll().map(o => o.prototype)
		]);
	}

	/**
	 * Returns a set containing all of the given application's constructors for services and controllers.
	 * @param application
	 * @returns
	 */
	private getApplicationConstructors(application: Application) {
		return new Set([
			...application.services.getAll(),
			...application.controllers.getAll()
		]);
	}

}

/**
 * The global attribute registry.
 */
export const AttributeRegistry = new AttributeRegistryImpl();

interface AttributeRegistration {
	classes: NestedSet<[constructor: Constructor<any>], IAttributeInstance<any>>;
	methods: NestedSet<[target: Object, method: string], IAttributeInstance<any>>;
	parameters: NestedSet<[target: Object, method: string, index: number], IAttributeInstance<any>>;
	properties: NestedSet<[target: Object, property: string], IAttributeInstance<any>>;
}
