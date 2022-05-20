import { Constructor } from '@baileyherbert/types';
import { Controller } from '../../controllers/Controller';
import { BaseModule } from '../../modules/BaseModule';
import { isConstructor } from '../../utilities/types';
import { Application } from '../Application';
import { ModuleToken } from './ApplicationModuleManager';

export class ApplicationControllerManager {

	protected controllers = new Set<Constructor<Controller>>();
	protected instances = new Map<Constructor<Controller>, Controller>();
	protected parents = new Map<Constructor<Controller>, BaseModule>();

	/**
	 * A map linking modules to the controllers registered directly under them (not nested).
	 */
	protected modules = new Map<BaseModule, Set<Constructor<Controller>>>();

	/**
	 * A cache for deeply nested services inside each module.
	 */
	protected modulesNestedCache?: Map<BaseModule, Controller[]>;

	public constructor(protected application: Application) {}

	/**
	 * Manually registers a controller in the application.
	 * @param controller The controller constructor.
	 * @param module The module under which the controller is to be imported.
	 */
	public register(controller: Constructor<Controller>, module: BaseModule) {
		if (!this.controllers.has(controller)) {
			this.controllers.add(controller);
			this.parents.set(controller, module);
			this.application.container.registerSingleton(controller);
			this.modulesNestedCache = new Map();

			if (!this.modules.has(module)) {
				this.modules.set(module, new Set());
			}

			this.modules.get(module)?.add(controller);
		}
	}

	/**
	 * Registers controllers from the given model recursively.
	 * @param module
	 * @internal
	 */
	public registerFromModule(module: BaseModule) {
		const controllers = module.options.controllers ?? [];

		for (const controller of controllers) {
			this.register(controller, module);
		}

		for (const childModule of this.application.modules.getChildModules(module)) {
			this.registerFromModule(childModule);
		}
	}

	/**
	 * Resolves all instances.
	 * @returns
	 */
	public resolveAll() {
		for (const constructor of this.controllers) {
			if (!this.instances.has(constructor)) {
				this.instances.set(
					constructor,
					this.application.container.resolve(constructor)
				);
			}
		}

		return [...this.instances.values()];
	}

	/**
	 * Resolves the singleton instance of the given service.
	 *
	 * @param controller
	 * @returns
	 */
	 public resolve<T extends Controller>(controller: ControllerToken<T>): T {
		if (isConstructor(controller)) {
			if (!this.controllers.has(controller)) {
				throw new Error(`Attempt to resolve unregistered controller "${controller.name}"`);
			}

			if (!this.instances.has(controller)) {
				this.resolveAll();

				if (!this.instances.has(controller)) {
					throw new Error(`Failed to instantiate controller "${controller.name}"`);
				}
			}

			return this.instances.get(controller) as T;
		}

		if (controller instanceof Controller) {
			return controller;
		}

		throw new Error(`Could not resolve value of type ${typeof controller} to a controller instance`);
	}

	/**
	 * Returns the parent module for the given controller.
	 * @param controller
	 * @returns
	 */
	public getParentModule(controller: ControllerToken) {
		if (!isConstructor(controller)) {
			controller = controller.constructor as Constructor<Controller>;
		}

		const module = this.parents.get(controller);

		if (module === undefined) {
			throw new Error(
				`Failed to retrieve the module for controller instance "${controller.name}" because no module ` +
				`was registered in the controller manager`
			);
		}

		return module;
	}

	/**
	 * Returns an array of all modules that are above the given controller. The first module in the array will be the
	 * direct parent of the controller, and the last module will be the application.
	 *
	 * @param controller
	 * @returns
	 */
	public getParentModules(controller: ControllerToken) {
		if (!isConstructor(controller)) {
			controller = controller.constructor as Constructor<Controller>;
		}

		const parents = new Set<BaseModule>();
		let parent = this.parents.get(controller);

		if (parent === undefined) {
			throw new Error(
				`Failed to retrieve the module for controller instance "${controller.name}" because no module ` +
				`was registered in the controller manager`
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
	 * Returns an array of all controllers inside the given module.
	 * @param module The module to search.
	 * @param deep Whether or not to include controller in child modules (default=true).
	 * @returns
	 */
	public getFromModule(module: ModuleToken, deep = true): Controller[] {
		const instance = this.application.modules.resolve(module);

		if (!this.modules.has(instance)) {
			if (module === this.application && deep) {
				return [...this.instances.values()];
			}

			return [];
		}

		if (!deep) {
			return [...this.modules.get(instance)!].map(constructor => this.resolve(constructor));
		}

		if (!this.modulesNestedCache?.has(instance)) {
			const controllers = new Set<Controller>();
			const children = this.application.modules.getChildModules(instance);

			for (const constructor of this.modules.get(instance)!) {
				controllers.add(this.resolve(constructor));
			}

			for (const childModule of children) {
				for (const constructor of this.getFromModule(childModule, true)) {
					controllers.add(this.resolve(constructor));
				}
			}

			this.modulesNestedCache?.set(instance, [...controllers]);
		}

		return this.modulesNestedCache?.get(instance)!;
	}

	/**
	 * Returns an array of constructors for all registered controllers in the order they were registered.
	 *
	 * @returns
	 */
	public getAll() {
		return [...this.controllers];
	}

}

export type ControllerToken<T extends Controller = Controller> = Constructor<T> | T;
