import { registry } from '@baileyherbert/container';
import { DependencyGraph } from '@baileyherbert/dependency-graph';
import { ReflectionClass, ReflectionParameter } from '@baileyherbert/reflection';
import { Constructor } from '@baileyherbert/types';
import { NotImplementedError } from '../../main';
import { BaseModule } from '../../modules/BaseModule';
import { Service } from '../../services/Service';
import { isConstructor } from '../../utilities/types';
import { Application } from '../Application';

export class ApplicationServiceManager {

	/**
	 * A set containing all registered services.
	 */
	protected services = new Set<Constructor<Service>>();

	/**
	 * A set containing service instances.
	 */
	protected instances = new Map<Constructor<Service>, Service>();

	/**
	 * A map linking services to their parent modules.
	 */
	protected modules = new Map<Constructor<Service>, BaseModule>();

	/**
	 * A cache for the computed load paths, to be reset whenever new modules are registered.
	 */
	protected cachedPaths?: Constructor<Service>[][];

	/**
	 * Constructs a new `ApplicationServiceManager` instance for the given root application object.
	 * @param application
	 */
	public constructor(protected application: Application) {}

	/**
	 * Manually registers a service in the application.
	 * @param service The service constructor.
	 * @param module The module under which the service is to be imported.
	 */
	public register(service: Constructor<Service>, module: BaseModule) {
		if (!this.services.has(service)) {
			this.services.add(service);
			this.modules.set(service, module);
			this.application.container.registerSingleton(service);
			this.cachedPaths = undefined;
		}
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
		const instances = new Array<Service>();

		for (const path of paths) {
			for (const node of path) {
				const instance = this.application.container.resolve(node);

				if (!this.instances.has(node)) {
					this.instances.set(node, instance);
				}

				instances.push(instance);
			}
		}

		return instances;
	}

	/**
	 * Resolves the singleton instance of the given service.
	 *
	 * @param service
	 * @returns
	 */
	public resolve<T extends Service>(service: ServiceToken<T>): T {
		if (isConstructor(service)) {
			if (!this.services.has(service)) {
				throw new Error(`Attempt to resolve unregistered service "${service.name}"`);
			}

			if (!this.instances.has(service)) {
				this.resolveAll();

				if (!this.instances.has(service)) {
					throw new Error(`Failed to instantiate service "${service.name}"`);
				}
			}

			return this.instances.get(service) as T;
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
	private start(service: ServiceToken) {
		const instance = this.resolve(service);
		return instance.__internStart();
	}

	/**
	 * Stops the specified service.
	 *
	 * @param service
	 * @returns
	 */
	private stop(service: ServiceToken) {
		const instance = this.resolve(service);
		return instance.__internStop();
	}

	/**
	 * Starts all services in the application in the order necessary based on their dependencies.
	 * @returns
	 * @internal
	 */
	public async startAll() {
		const paths = this.getResolutionOrder();
		const promises = new Array<Promise<void>>();

		for (const path of paths) {
			promises.push(this.onPath(path, service => {
				return this.start(service);
			}));
		}

		return Promise.all(promises);
	}

	/**
	 * Stops all services in the application in the order necessary based on their dependencies.
	 * @returns
	 * @internal
	 */
	public async stopAll() {
		const paths = this.getResolutionOrder();
		const promises = new Array<Promise<void>>();

		for (const path of paths) {
			promises.push(this.onPath(path.reverse(), service => {
				return this.stop(service);
			}));
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
			const instance = this.resolve(node);
			await callback(instance);
		}
	}

	/**
	 * Returns the parent module for the given service.
	 * @param service
	 * @returns
	 */
	public getModule(service: ServiceToken) {
		if (!isConstructor(service)) {
			service = service.constructor as Constructor<Service>;
		}

		const module = this.modules.get(service);

		if (module === undefined) {
			throw new Error(
				`Failed to retrieve the module for service instance "${service.name}" because no module ` +
				`was registered in the service manager`
			);
		}

		return module;
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
