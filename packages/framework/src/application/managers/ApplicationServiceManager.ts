import { registry } from '@baileyherbert/container';
import { DependencyGraph } from '@baileyherbert/dependency-graph';
import { NestedSet } from '@baileyherbert/nested-collections';
import { ReflectionClass, ReflectionParameter } from '@baileyherbert/reflection';
import { Constructor } from '@baileyherbert/types';
import { NotImplementedError } from '../../errors/development/NotImplementedError';
import { ErrorManager } from '../../errors/ErrorManager';
import { ServiceOperationError } from '../../errors/kinds/ServiceOperationError';
import { BaseModule } from '../../modules/BaseModule';
import { Service } from '../../services/Service';
import { isConstructor } from '../../utilities/types';
import { Application } from '../Application';
import { ModuleToken } from './ApplicationModuleManager';

export class ApplicationServiceManager {

	/**
	 * A set containing all registered services.
	 */
	protected services = new Set<Constructor<Service>>();

	/**
	 * A nested set containing service constructors and their instances.
	 */
	protected instances = new NestedSet<Constructor<Service>, Service>();

	/**
	 * All instances registered across the application.
	 */
	protected globalInstances = new Set<Service>();

	/**
	 * A map linking services to their parent modules.
	 */
	protected parents = new Map<Service, BaseModule>();

	/**
	 * A map linking modules to the services registered directly under them (not nested).
	 */
	protected modules = new NestedSet<BaseModule, Service>();

	/**
	 * A map linking constructors of services to the modules that use them.
	 */
	protected serviceModules = new NestedSet<Constructor<Service>, BaseModule>();

	/**
	 * A cache for deeply nested services inside each module.
	 */
	protected modulesNestedCache?: Map<BaseModule, Service[]>;

	/**
	 * A cache for the computed load paths, to be reset whenever new modules are registered.
	 */
	protected cachedPaths?: Constructor<Service>[][];

	/**
	 * A set containing all running services.
	 */
	protected active = new Set<Service>();

	/**
	 * A set containing all registered services.
	 */
	protected registered = new Set<Service>();

	/**
	 * The error manager for this instance.
	 */
	protected errors: ErrorManager;

	/**
	 * Constructs a new `ApplicationServiceManager` instance for the given root application object.
	 * @param application
	 */
	public constructor(protected application: Application) {
		this.errors = application.errors.createManager(this);
	}

	/**
	 * Manually registers a service in the application.
	 * @param service The service constructor.
	 * @param module The module under which the service is to be imported.
	 */
	public register(service: Constructor<Service>, module: BaseModule) {
		if (!this.services.has(service)) {
			this.services.add(service);

			this.cachedPaths = undefined;
			this.modulesNestedCache = new Map();
		}

		this.serviceModules.add(service, module);
	}

	/**
	 * Registers services from the given model recursively.
	 * @param module
	 * @internal
	 */
	public registerFromModule(module: BaseModule) {
		const services = module.options.services ?? [];

		for (const service of services) {
			this.register(service, module);
		}

		for (const childModule of this.application.modules.getChildModules(module)) {
			this.registerFromModule(childModule);
		}
	}

	/**
	 * Resolves all instances in a computed order based on their dependencies.
	 * @returns
	 */
	public resolveAll() {
		const paths = this.getResolutionOrder();

		for (const path of paths) {
			for (const constructor of path) {
				const modules = [...this.serviceModules.values(constructor)];

				// Prevent duplication
				if (this.instances.hasKey(constructor)) {
					continue;
				}

				// Create an instance of the service for each module that uses it
				for (const module of modules) {
					this.application.container.setContext('_tsfw_parentModuleContext', (target: any) => {
						if (target instanceof constructor) {
							return module;
						}

						this.errors.abort(
							new Error(`Constructor import ${target.constructor.name} could not be resolved`)
						);
					});

					const contexts = [module, ...this.application.modules.getParentModules(module)];

					this.application.container.setContext('defaultResolutionContext', contexts);
					const instance = this.application.container.resolve(constructor);
					this.application.container.removeContext('defaultResolutionContext');

					this.instances.add(constructor, instance);
					this.globalInstances.add(instance);
					this.parents.set(instance, module);
					this.modules.add(module, instance);

					// Register the instance in the container with the module as its context
					this.application.container.registerInstance(instance, module);

					// Register as a singleton if there's only one
					if (modules.length === 1) {
						this.application.container.registerInstance(instance);
					}

					// Register the instance under the module's context
					if (typeof module._internContext !== 'undefined') {
						this.application.container.registerInstance(instance, module._internContext);
					}

					this.application.extensions._invokeComposerEvent(instance, 'afterResolution');
				}
			}
		}

		return [...this.globalInstances.values()];
	}

	/**
	 * Resolves an instance of the given service or resolves it from a constructor. If a constructor is provided and
	 * multiple instances exist, an error will be thrown.
	 *
	 * @param service
	 * @returns
	 */
	public resolve<T extends Service>(service: ServiceToken<T>): T;
	public resolve<T extends Service>(service: ServiceToken<T>, all: true): T[];
	public resolve<T extends Service>(service: ServiceToken<T>, all = false): T | T[] {
		if (isConstructor(service)) {
			if (!this.services.has(service)) {
				throw new Error(`Attempt to resolve unregistered service "${service.name}"`);
			}

			if (!this.instances.hasKey(service)) {
				this.resolveAll();

				if (!this.instances.hasKey(service)) {
					throw new Error(`Failed to instantiate service "${service.name}"`);
				}
			}

			const available = this.instances.get(service)!;

			if (all) {
				return [...available] as T[];
			}

			if (available.size > 1) {
				if (available.size > 1) {
					throw new Error(`Multiple instances of service ${service.name} are available`);
				}
			}

			return [...available][0] as T;
		}

		if (service instanceof Service) {
			return service;
		}

		throw new Error(`Could not resolve value of type ${typeof service} to a service instance`);
	}

	/**
	 * Returns an array of load paths. Each load path is an array of service constructors which should be started in
	 * the specified order (and stopped in the reverse order). Each load path is independent and can be started at the
	 * same time as the other load paths.
	 * @returns
	 * @internal
	 */
	public getResolutionOrder() {
		if (this.cachedPaths === undefined) {
			const graph = new DependencyGraph<Constructor<Service>>();

			for (const service of this.services) {
				graph.addNode(service);
			}

			for (const service of this.services) {
				const paramTypes: ReflectionParameter[] = registry.getConstructorParameters(service);

				if (paramTypes === undefined) {
					const ref = new ReflectionClass(service);
					const parameters = ref.getConstructorMethod().getParameters();

					if (parameters.length !== 0) {
						throw new Error(
							`Failed to read the parameters from the "${ref.name}" constructor. You might need to add ` +
							`a decorator to the class, such as @Injectable().`
						);
					}

					continue;
				}

				for (const param of paramTypes) {
					const override = registry.getParameterToken(service, 'constructor', param.index);

					if (override !== undefined) {
						throw new NotImplementedError('Token overrides are not yet supported');
					}

					if (param.isClassType) {
						const type = param.getType() as Constructor<any>;

						if (this.services.has(type)) {
							graph.addDependency(service, type);
						}
					}
					else if (!param.isKnownType && !param.hasDefault) {
						const name = service.constructor.name;

						throw new Error(
							`Cannot read the dependency at index ${param.index} of the "${name}" constructor: ` +
							`The type is undefined. This could mean the @Injectable decorator is missing, or there ` +
							`may be a circular dependency.`
						);
					}
				}
			}

			// Compute load paths

			// We should return an array of "load path" arrays, where each load path is another array containing the
			// services to load in the order specified

			// Note that we can have multiple independent load paths when the paths do not have any common dependencies
			// This means they can be asynchronously started at the same time without any conflicts

			const roots = graph.getEntryNodes();
			const paths = new Array<Array<Constructor<Service>>>();

			const traverse = (nodes: Constructor<Service>[], index: number) => {
				for (const node of nodes) {
					paths[index].unshift(node);
					traverse(graph.getDirectDependenciesOf(node), index);
				}
			};

			for (let index = 0; index < roots.length; index++) {
				paths[index] = [];
				traverse([roots[index]], index);

				// Use set magic to remove duplicates and preserve only the first instances
				paths[index] = [...(new Set(paths[index]))];
			}

			this.cachedPaths = paths;
		}

		return this.cachedPaths;
	}

	/**
	 * Starts the specified service.
	 *
	 * @param service
	 * @returns
	 */
	private async start(service: Service<any>) {
		const parents = this.getParentModules(service);

		for (const parent of [...parents].reverse()) {
			await this.application.modules.startModule(parent, false);
		}

		if (this.active.has(service)) {
			this.application.logger.trace('Ignored request to start active service: %s', service.constructor.name);
			return;
		}

		this.active.add(service);
		this.application.logger.trace('Starting service:', service.constructor.name);

		if (!this.registered.has(service)) {
			this.registered.add(service);

			try {
				await service.__internRegister();
			}
			catch (error) {
				this.errors.abort(new ServiceOperationError('register'), error);
			}
		}

		try {
			this.application.extensions._invokeComposerEvent(service, 'beforeStart');
			await service.__internStart();
			this.application.extensions._invokeComposerEvent(service, 'afterStart');
		}
		catch (error) {
			this.errors.abort(new ServiceOperationError('start'), error);
		}

		for (const parent of parents) {
			const services = this.getFromModule(parent, true);
			const remaining = services.filter(service => !this.active.has(service));

			if (remaining.length === 0) {
				await this.application.modules.startModule(parent, true);
			}
		}
	}

	/**
	 * Stops the specified service.
	 *
	 * @param service
	 * @returns
	 */
	private async stop(service: Service<any>) {
		const parents = this.getParentModules(service);

		for (const parent of [...parents].reverse()) {
			await this.application.modules.stopModule(parent, false);
		}

		if (!this.active.has(service)) {
			this.application.logger.trace('Ignored request to stop inactive service: %s', service.constructor.name);
			return;
		}

		this.active.delete(service);
		this.application.logger.trace('Stopping service:', service.constructor.name);

		try {
			this.application.extensions._invokeComposerEvent(service, 'beforeStop');
			await service.__internStop();
			this.application.extensions._invokeComposerEvent(service, 'afterStop');
		}
		catch (error) {
			this.errors.abort(new ServiceOperationError('stop'), error);
		}

		for (const parent of parents) {
			const services = this.getFromModule(parent, true);
			const active = services.filter(service => this.active.has(service));

			if (active.length === 0) {
				await this.application.modules.stopModule(parent, true);
			}
		}
	}

	/**
	 * Starts all services in the application in the order necessary based on their dependencies.
	 * @returns
	 * @internal
	 */
	public async startAll() {
		if (this.active.size > 0) {
			return;
		}

		const paths = this.getResolutionOrder();
		const promises = new Array<Promise<void>>();

		for (const path of paths) {
			promises.push(this.onPath(
				path,
				service => this.start(service)
			));
		}

		return Promise.all(promises);
	}

	/**
	 * Stops all services in the application in the order necessary based on their dependencies.
	 * @returns
	 * @internal
	 */
	public async stopAll() {
		if (this.active.size === 0) {
			return;
		}

		const paths = this.getResolutionOrder();
		const promises = new Array<Promise<void>>();

		for (const path of paths) {
			promises.push(this.onPath(
				path.reverse(),
				service => this.stop(service)
			));
		}

		return Promise.all(promises);
	}

	/**
	 * Sequentially awaits a callback on all nodes in the given path and resolves once completed.
	 * @param path
	 * @param callback
	 */
	private async onPath(path: Constructor<Service>[], callback: (service: Service) => Promise<void>) {
		for (const node of path) {
			for (const instance of this.resolve(node, true)) {
				await callback(instance);
			}
		}
	}

	/**
	 * Returns the parent module for the given service.
	 * @param service
	 * @returns
	 */
	public getParentModule(service: Service<any>) {
		const module = this.parents.get(service);

		if (module === undefined) {
			throw new Error(
				`Failed to retrieve the module for service instance "${service.constructor.name}" because no module ` +
				`was registered in the service manager`
			);
		}

		return module;
	}

	/**
	 * Returns an array of all modules that are above the given service. The first module in the array will be the
	 * direct parent of the service, and the last module will be the application.
	 * @param service
	 * @returns
	 */
	public getParentModules(service: Service<any>) {
		const parents = new Set<BaseModule>();
		let parent = this.parents.get(service);

		if (parent === undefined) {
			throw new Error(
				`Failed to retrieve the module for service instance "${service.constructor.name}" because no module ` +
				`was registered in the service manager`
			);
		}

		while (parent) {
			parents.add(parent);
			parent = this.application.modules.getParentModule(parent);
		}

		parents.add(this.application);

		return [...parents];
	}

	/**
	 * Returns an array of all services inside the given module.
	 * @param module The module to search.
	 * @param deep Whether or not to include services in child modules (default=true).
	 * @returns
	 */
	public getFromModule(module: ModuleToken, deep = true): Service[] {
		const instance = this.application.modules.resolve(module);
		const moduleInstances = this.modules.get(instance);

		if (!moduleInstances) {
			if (module === this.application && deep) {
				return [...this.globalInstances.values()];
			}

			return [];
		}

		if (!deep) {
			return [...moduleInstances].map(constructor => this.resolve(constructor));
		}

		if (!this.modulesNestedCache?.has(instance)) {
			const services = new Set<Service>();
			const children = this.application.modules.getChildModules(instance);

			for (const constructor of moduleInstances) {
				services.add(this.resolve(constructor));
			}

			for (const childModule of children) {
				for (const constructor of this.getFromModule(childModule, true)) {
					services.add(this.resolve(constructor));
				}
			}

			this.modulesNestedCache?.set(instance, [...services]);
		}

		return this.modulesNestedCache?.get(instance)!;
	}

	/**
	 * Returns an array of constructors for all registered services in the order they were registered.
	 *
	 * @returns
	 */
	public getAll() {
		return [...this.services];
	}

}

export type ServiceToken<T extends Service = Service> = Constructor<T> | T;
