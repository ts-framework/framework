import { DependencyGraph } from '@baileyherbert/dependency-graph';
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
	 * A dependency graph containing all registered modules to determine the import order.
	 */
	protected graph = new DependencyGraph<BaseModule, ModuleData>();

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
		const imports = module.options.imports ?? [];

		this.modules.add(module);
		this.graph.addNode(module);

		if (!(module instanceof Application)) {
			this.application.container.registerInstance(module);
		}

		if (options !== undefined && module instanceof Module) {
			if (options.logging !== undefined) {
				module.options.logging = options.logging;
				module.logger.level = normalizeLogLevel(options.logging);
			}
		}

		for (const importable of imports) {
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
	 *
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
				module: new importable()
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
				const instance = new result();

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
	 * Returns the data associated with the given module.
	 *
	 * @param module
	 */
	public getData(module: Module): ModuleData | undefined {
		if (this.graph.hasNodeData(module)) {
			return this.graph.getNodeData(module);
		}

		return undefined;
	}

	/**
	 * Returns the parent module for the given module instance or `undefined` if its parent is unavailable or is the
	 * root application.
	 *
	 * @param module
	 */
	public getParentModule(module: BaseModule): BaseModule | undefined {
		if (this.graph.hasNode(module)) {
			return this.graph.getDirectDependenciesOf(module)[0];
		}

		return;
	}

	/**
	 * Returns all modules registered directly under the specified parent module.
	 *
	 * @param module
	 */
	public getChildModules(module: BaseModule): BaseModule[] {
		if (this.graph.hasNode(module)) {
			return this.graph.getDirectDependentsOf(module);
		}

		return [];
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
