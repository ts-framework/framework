import { Injectable } from '@baileyherbert/container';
import { NestedSet } from '@baileyherbert/nested-collections';
import { IAttribute, IAttributeInstance, ReflectionClass } from '@baileyherbert/reflection';
import { Constructor } from '@baileyherbert/types';
import { Application } from '../../application/Application';
import { BaseModule } from '../../modules/BaseModule';
import { Service } from '../Service';
import { Component } from './Attribute';
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
	public getClasses<A extends IAttribute<any>>(application: Application, service: Service<any>, attribute: A) {
		const registration = this.getAttributeRegistration(attribute);
		const classes = new Array<ClassAttributeRegistration<A>>();
		const constructors = this.getApplicationConstructors(application);

		for (const constructor of constructors) {
			if (registration.classes.hasKey([constructor])) {
				const attributes = [...registration.classes.get([constructor])!];
				const reflection = new ReflectionClass(constructor);
				const targets = this.getClassTargets(application, reflection, service);

				classes.push(new ClassAttributeRegistration(
					application,
					targets,
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
	public getMethods<A extends IAttribute<any>>(application: Application, service: Service<any>, attribute: A) {
		const registration = this.getAttributeRegistration(attribute);
		const methods = new Array<MethodAttributeRegistration<A>>();
		const prototypes = this.getApplicationPrototypes(application);

		for (const prototype of prototypes) {
			if (registration.methods.hasKey([prototype])) {
				const reflection = new ReflectionClass(prototype.constructor);
				const targets = this.getClassTargets(application, reflection, service);

				for (const [methodName, set] of registration.methods.get([prototype])!) {
					const method = reflection.getMethod(methodName)!;
					const attributes = [...set];

					methods.push(new MethodAttributeRegistration(
						application,
						targets,
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
	public getParameters<A extends IAttribute<any>>(application: Application, service: Service<any>, attribute: A) {
		const registration = this.getAttributeRegistration(attribute);
		const parameters = new Array<ParameterAttributeRegistration<A>>();
		const prototypes = this.getApplicationPrototypes(application);

		for (const prototype of prototypes) {
			if (registration.parameters.hasKey([prototype])) {
				const reflection = new ReflectionClass(prototype.constructor);
				const targets = this.getClassTargets(application, reflection, service);

				for (const [methodName, indices] of registration.parameters.get([prototype])!) {
					for (const [index, set] of indices) {
						const parameter = reflection.getMethod(methodName)?.getParameter(index)!;
						const attributes = [...set];

						parameters.push(new ParameterAttributeRegistration(
							application,
							targets,
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
	public getProperties<A extends IAttribute<any>>(application: Application, service: Service<any>, attribute: A) {
		const registration = this.getAttributeRegistration(attribute);
		const properties = new Array<PropertyAttributeRegistration<A>>();
		const prototypes = this.getApplicationPrototypes(application);

		for (const prototype of prototypes) {
			if (registration.properties.hasKey([prototype])) {
				const reflection = new ReflectionClass(prototype.constructor);
				const targets = this.getClassTargets(application, reflection, service);

				for (const [propName, set] of registration.properties.get([prototype])!) {
					const property = reflection.getProperty(propName)!;
					const attributes = [...set];

					properties.push(new PropertyAttributeRegistration(
						application,
						targets,
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

	/**
	 * Returns an array of component instances to target for the given reflection instance and from the perspective
	 * of the given service. If the service is inside a multi-instanced module, then any components that use the
	 * attribute will be scoped to the service's particular instance of that module and its children.
	 * @param application
	 * @param reflection
	 * @param service
	 * @returns
	 */
	private getClassTargets(application: Application, reflection: ReflectionClass, service: Service<any>): Component[] {
		const root = this.getTopMultipleModule(application, service);

		// When we're working inside a multi-instanced module we must only resolve instances of services and
		// controllers that are either a) within our root instance or outside of the root module entirely
		if (root) {
			const children = [root, ...application.modules.getChildModules(root, true)].reverse();
			const components = [
				...application.controllers.getFromModule(root, true),
				...application.services.getFromModule(root, true)
			];

			// Check if the target is inside that root module
			for (const component of components) {
				if (component.constructor === reflection.target) {
					// Resolve the component only within the root model or its children
					return application.container.resolveAll<Component>(reflection.target, children);
				}
			}
		}

		// Otherwise resolve all known instances of the target
		return application.container.resolveAll<Component>(reflection.target);
	}

	/**
	 * Finds and returns the topmost parent module of the given service that is multi-instanced in the current
	 * application.
	 * @param application
	 * @param service
	 * @returns
	 */
	private getTopMultipleModule(application: Application, service: Service<any>) {
		let parent: BaseModule | undefined = service.module;
		let topModule: BaseModule | undefined;

		while (parent) {
			if (parent._internMultipleInstances) {
				topModule = parent;
			}

			parent = application.modules.getParentModule(parent);
		}

		return topModule;
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
