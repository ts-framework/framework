import { Cache } from '@baileyherbert/cache';
import { DependencyGraph } from '@baileyherbert/dependency-graph';
import { Constructor } from '@baileyherbert/types';
import { BaseModule } from '../../modules/BaseModule';
import { Importable } from '../../modules/Importable';
import { Module } from '../../modules/Module';
import { ModuleOverrideOptions } from '../../modules/ModuleOptions';
import { normalizeLogLevel } from '../../utilities/normalizers';
import { isConstructor } from '../../utilities/types';
import { Application } from '../Application';

export class ApplicationModuleManager {

	/**
	 * A set containing all registered modules.
	 */
	protected modules = new Set<BaseModule>();

	/**
	 * A map of module constructors and their instances.
	 */
	protected constructors = new Map<Constructor<BaseModule>, BaseModule>();

	/**
	 * A dependency graph containing all registered modules to determine the import order.
	 */
	protected graph = new DependencyGraph<BaseModule, ModuleData>();

	/**
	 * A cache of module lifecycle invocations and their timestamps.
	 */
	protected lifecycleCache = new Cache<[BaseModule, Lifecycle], number>();

	/**
	 * Constructs a new `ApplicationModuleManager` instance for the given root application object.
	 * @param application
	 */
	public constructor(protected application: Application) {}

	/**
	 * Imports the given module into the application, and recursively imports its children.
	 * @param module The module to import.
	 * @param options The options to override for this module (does not directly affect children but may be inherited).
	 * @internal
	 */
	public async import(module: BaseModule, options?: ModuleOverrideOptions) {
		this.modules.add(module);
		this.constructors.set(module.constructor as Constructor<BaseModule>, module);
		this.graph.addNode(module);

		if (module instanceof Module) {
			this.application.container.registerInstance(module);
		}

		await this.invokeLifecycle(module, 'onModuleRegister');

		if (options !== undefined && module instanceof Module) {
			if (options.logging !== undefined) {
				module.options.logging = options.logging;
				module.logger.level = normalizeLogLevel(options.logging);
			}
		}

		for (const importable of module.options.imports ?? []) {
			await this.register(importable, module);
		}
	}

	/**
	 * Manually registers a module in the application.
	 * @param importable The module to import.
	 * @param parent The parent module to import under.
	 * @returns Resolves to the resulting module instance.
	 */
	public async register(importable: Importable, parent: BaseModule) {
		const startTime = Date.now();
		const resolved = await this.resolveModule(importable);
		const millis = Date.now() - startTime;

		if (!this.modules.has(resolved.module)) {
			this.modules.add(resolved.module);
			this.graph.addNode(resolved.module, {
				parentModule: parent,
				resolveTimeMillis: millis,
				options: resolved.options ?? {}
			});

			this.graph.addDependency(resolved.module, parent);
			await this.import(resolved.module, resolved.options);
		}

		return resolved.module;
	}

	/**
	 * Resolves an importable into a module instance along with its override options when provided.
	 * @param importable
	 * @returns
	 */
	private async resolveModule(importable: Importable | Module): Promise<ResolvedModule> {
		if (importable instanceof Module) {
			return {
				module: importable
			};
		}
		else if (isConstructor(importable)) {
			return {
				module: this.application.container.resolve(importable)
			};
		}
		else if (typeof importable === 'function') {
			const result = await importable();

			if (result instanceof Module) {
				return {
					module: result
				};
			}

			if (isConstructor(result)) {
				const instance = this.application.container.resolve(result);

				if (instance instanceof Module) {
					return {
						module: instance
					};
				}
			}

			throw new Error('Function did not resolve to a module');
		}
		else if (typeof importable === 'object') {
			const resolved = await this.resolveModule(importable.import);

			if (!(resolved.module instanceof Module)) {
				throw new Error('The options object could not resolve to a module instance');
			}

			const options: any = Object.assign({}, importable);
			delete options.module;

			return {
				module: resolved.module,
				options
			};
		}

		throw new Error('The given value is not an importable type');
	}

	/**
	 * Resolves the singleton instance of the given module.
	 * @param module
	 * @returns
	 */
	public resolve<T extends BaseModule>(module: ModuleToken<T>): T {
		if (module instanceof BaseModule) {
			return module;
		}

		if (this.constructors.has(module)) {
			return this.constructors.get(module)! as T;
		}

		throw new Error(`Could not resolve value of type ${typeof module} to a module instance`);
	}

	/**
	 * Returns the data associated with the given module.
	 * @param module
	 */
	public getData(module: ModuleToken): ModuleData | undefined {
		const instance = this.resolve(module);

		if (this.graph.hasNodeData(instance)) {
			return this.graph.getNodeData(instance);
		}

		return undefined;
	}

	/**
	 * Returns the parent module for the given module instance or `undefined` if its parent is unavailable or is the
	 * root application.
	 * @param module
	 */
	public getParentModule(module: ModuleToken): BaseModule | undefined {
		const instance = this.resolve(module);

		if (this.graph.hasNode(instance)) {
			return this.graph.getDirectDependenciesOf(instance)[0];
		}

		return;
	}

	/**
	 * Returns all modules registered directly under the specified parent module.
	 * @param module
	 */
	public getChildModules(module: ModuleToken): BaseModule[] {
		const instance = this.resolve(module);

		if (this.graph.hasNode(instance)) {
			return this.graph.getDirectDependentsOf(instance);
		}

		return [];
	}

	/**
	 * Runs the specified lifecycle method on the given module and its services.
	 * @param module
	 * @param lifecycle
	 * @internal
	 */
	public async invokeLifecycle(module: ModuleToken, lifecycle: Lifecycle) {
		const promises = new Array<Promise<void> | void>();
		const instance = this.resolve(module);

		if (this.lifecycleCache.has([instance, lifecycle])) return;
		this.lifecycleCache.set([instance, lifecycle], Date.now());

		if (lifecycle in module) {
			promises.push((module as any)[lifecycle]());
		}

		for (const service of this.application.services.getFromModule(module, false)) {
			if (lifecycle in service) {
				promises.push((service as any)[lifecycle]());
			}
		}

		return Promise.all(promises);
	}

	/**
	 * Clears the internal lifecycle cache. This should be called when the application is stopped.
	 * @internal
	 */
	public clearLifecycleCache() {
		this.lifecycleCache.clear();
	}

	/**
	 * Invokes the boot lifecycle method on the given module.
	 * @param module
	 * @param finished
	 * @returns
	 * @internal
	 */
	public async startModule(module: ModuleToken, finished: boolean) {
		return this.invokeModuleMethod(module, finished, ['beforeModuleBoot', 'onModuleBoot']);
	}

	/**
	 * Invokes the shutdown lifecycle method on the given module.
	 * @param module
	 * @param finished
	 * @returns
	 * @internal
	 */
	public async stopModule(module: ModuleToken, finished: boolean) {
		return this.invokeModuleMethod(module, finished, ['beforeModuleShutdown', 'onModuleShutdown']);
	}

	/**
	 * Invokes a lifecycle method on the given module, choosing between the given types[0] when not finished and the
	 * given types[1] when finished. In addition, the module's children will be recursively iterated and the same
	 * lifecycle method will be applied on child modules with no services.
	 * @param module
	 * @param finished
	 * @param types
	 */
	private async invokeModuleMethod(module: ModuleToken, finished: boolean, types: [Lifecycle, Lifecycle]) {
		const event: Lifecycle = types[finished ? 1 : 0];
		const nest = async () => {
			for (const childModule of this.getChildModules(module)) {
				const children = this.application.services.getFromModule(childModule, true);

				if (children.length === 0) {
					await this.invokeModuleMethod(childModule, finished, types);
				}
			}
		};

		if (finished) {
			await nest();
		}

		await this.invokeLifecycle(module, event);

		if (!finished) {
			await nest();
		}
	}

}

export interface ModuleData {
	parentModule: BaseModule | Application;
	resolveTimeMillis: number;
	options: ModuleOverrideOptions;
}

interface ResolvedModule {
	module: BaseModule;
	options?: ModuleOverrideOptions;
}

export type ModuleToken<T extends BaseModule = BaseModule> = Constructor<T> | T;

/**
 * @internal
 */
type Lifecycle = (
	'onModuleRegister' |
	'beforeModuleBoot' |
	'onModuleBoot' |
	'beforeModuleShutdown' |
	'onModuleShutdown'
);

/**
 * @internal
 */
export enum ModuleLifecycleType {
	BeforeStart = 'beforeModuleBoot',
	BeforeStop = 'beforeModuleShutdown',
	AfterStart = 'onModuleBoot',
	AfterStop = 'onModuleShutdown'
}
