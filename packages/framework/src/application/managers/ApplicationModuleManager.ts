import { NestedSet } from '@baileyherbert/nested-collections';
import { DependencyGraph } from '@baileyherbert/dependency-graph';
import { Constructor, Key } from '@baileyherbert/types';
import { BaseModule } from '../../modules/BaseModule';
import { Importable } from '../../modules/Importable';
import { Module } from '../../modules/Module';
import { ModuleOverrideOptions } from '../../modules/ModuleOptions';
import { normalizeLogLevel } from '../../utilities/normalizers';
import { isConstructor } from '../../utilities/types';
import { Application } from '../Application';
import { ComposerEvents } from '../../extensions/Composer';
import { LifecycleError } from '../../errors/lifecycles/LifecycleError';
import { AbortError } from '../../errors/lifecycles/AbortError';

export class ApplicationModuleManager {

	/**
	 * A set containing all registered modules.
	 */
	protected modules = new NestedSet<Constructor<BaseModule>, BaseModule>();

	/**
	 * A dependency graph containing all registered modules to determine the import order.
	 */
	protected graph = new DependencyGraph<BaseModule, ModuleData>();

	/**
	 * A cache of module lifecycle invocations.
	 */
	protected lifecycleCache = new NestedSet<BaseModule, Lifecycle>();

	protected startedModules = new Set<BaseModule>();
	protected activeModules = new Set<BaseModule>();

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
		const constructor = module.constructor as Constructor<BaseModule>;

		this.modules.add(constructor, module);
		this.graph.addNode(module);

		if (options !== undefined && module instanceof Module) {
			if (options.logging !== undefined) {
				module.options.logging = options.logging;
				module.logger.level = normalizeLogLevel(options.logging);
			}

			if (typeof options.environment === 'object') {
				module._internCustomEnvironment = options.environment;
			}

			if (typeof options.context !== 'undefined') {
				module._internContext = options.context;
			}
		}

		if (module instanceof Module) {
			this.application.extensions._invokeComposerEvent(module, 'afterResolution');
		}
		else if (module instanceof Application) {
			this.application.extensions._invokeComposerEvent(module, 'afterResolution');
		}

		module._internLoadEnvironment(this.application, this.application.environmentManager!);
		await this.invokeLifecycle(module, 'onModuleRegister');

		for (const importable of module.options.imports ?? []) {
			await this.register(importable, module);
		}

		if (module === this.application) {
			for (const constructor of this.modules.keys()) {
				const instances = [...this.modules.values(constructor)];

				for (const instance of instances) {
					instance._internMultipleInstances = instances.length > 1;

					if (instances.length === 1) {
						this.application.container.registerInstance(instance);
					}
				}
			}
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
		const type = resolved.module.constructor as Constructor<BaseModule>;

		if (!this.modules.has(type, resolved.module)) {
			this.modules.add(type, resolved.module);
			this.graph.addNode(resolved.module, {
				parentModule: parent,
				resolveTimeMillis: millis,
				options: resolved.options ?? {}
			});

			if (typeof resolved.module._internContext !== 'undefined') {
				this.application.container.registerInstance(
					resolved.module,
					resolved.module._internContext
				);
			}

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
			const result = await importable(this.application);
			return this.resolveModule(result);
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
	 * Resolves the instance of the given module or resolves it from its constructor. Throws an error if a
	 * constructor is provided and multiple instances are available.
	 * @param module
	 * @returns
	 */
	public resolve<T extends BaseModule>(module: ModuleToken<T>): T {
		if (module instanceof BaseModule) {
			return module;
		}

		if (this.modules.hasKey(module)) {
			const available = this.modules.get(module)!;

			if (available.size > 1) {
				throw new Error(`Multiple instances of module ${module.name} are available`);
			}

			return [...available][0] as T;
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
	 * Returns an array of all modules that are above the given module. The first module in the array will be the
	 * direct parent of the given module, and the last module will be the application.
	 * @param module
	 */
	public getParentModules(module: ModuleToken): BaseModule[] {
		const instance = this.resolve(module);

		const parents = new Array<BaseModule>();
		let parent: BaseModule | undefined = instance;

		while (parent) {
			parent = this.getParentModule(parent);

			if (parent) {
				parents.push(parent);
			}
		}

		return parents;
	}

	/**
	 * Returns all modules registered directly under the specified parent module.
	 * @param module
	 * @param deep When true, recursively finds all children under the module.
	 */
	public getChildModules(module: ModuleToken, deep = false): BaseModule[] {
		const instance = this.resolve(module);

		if (this.graph.hasNode(instance)) {
			const children = this.graph.getDirectDependentsOf(instance);

			if (deep) {
				for (const child of children) {
					children.push(...this.getChildModules(child, true));
				}
			}

			return children;
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

		if (this.lifecycleCache.has(instance, lifecycle)) return;
		this.lifecycleCache.add(instance, lifecycle);

		try {
			if (lifecycle in module) {
				promises.push((module as any)[lifecycle]());
			}

			for (const service of this.application.services.getFromModule(module, false)) {
				if (lifecycle in service) {
					promises.push((service as any)[lifecycle]());
				}
			}

			await Promise.all(promises);
		}
		catch (error) {
			instance.errors.emitCriticalError(new LifecycleError(), error);
			throw new AbortError();
		}
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
		const instance = this.resolve(module);

		if (!finished && !this.startedModules.has(instance)) {
			this.application.logger.trace('Starting module:', instance.constructor.name);
			this.startedModules.add(instance);

			this._invokeExtensionEvent(instance, 'beforeStart');
			await this.invokeLifecycle(instance, 'beforeModuleBoot');
		}

		else if (finished && !this.activeModules.has(instance)) {
			this.activeModules.add(instance);
			this._invokeExtensionEvent(instance, 'afterStart');
			await this.invokeLifecycle(instance, 'onModuleBoot');
		}
	}

	/**
	 * Invokes the shutdown lifecycle method on the given module.
	 * @param module
	 * @param finished
	 * @returns
	 * @internal
	 */
	public async stopModule(module: ModuleToken, finished: boolean) {
		const instance = this.resolve(module);

		if (!finished && this.activeModules.has(instance)) {
			this.application.logger.trace('Stopping module:', instance.constructor.name);
			this.activeModules.delete(instance);

			this._invokeExtensionEvent(instance, 'beforeStop');
			await this.invokeLifecycle(instance, 'beforeModuleShutdown');
		}

		else if (finished && this.startedModules.has(instance)) {
			this.startedModules.delete(instance);

			this._invokeExtensionEvent(instance, 'afterStop');
			await this.invokeLifecycle(instance, 'onModuleShutdown');
		}
	}

	/**
	 * Invokes the specified event on the module, first checking if it should be emitted on the `Module` type or the
	 * `Application` type instead.
	 * @param module
	 * @param event
	 */
	private _invokeExtensionEvent(module: BaseModule, event: Key<ComposerEvents>) {
		if (module instanceof Module) {
			this.application.extensions._invokeComposerEvent(module, event);
		}
		else if (module instanceof Application) {
			this.application.extensions._invokeComposerEvent(module, event);
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
