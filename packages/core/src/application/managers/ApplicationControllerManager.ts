import { NestedSet } from '@baileyherbert/nested-collections';
import { Constructor } from '@baileyherbert/types';
import { Controller } from '../../controllers/Controller';
import { ErrorManager } from '../../errors/ErrorManager';
import { BaseModule } from '../../modules/BaseModule';
import { isConstructor } from '../../utilities/types';
import { Application } from '../Application';
import { ModuleToken } from './ApplicationModuleManager';

export class ApplicationControllerManager {

	protected controllers = new Set<Constructor<Controller>>();

	/**
	 * A nested set containing controller constructors and their instances.
	 */
	protected instances = new NestedSet<Constructor<Controller>, Controller>();

	/**
	 * All instances registered across the application.
	 */
	protected globalInstances = new Set<Controller>();

	/**
	 * A map linking controllers to their parent modules.
	 */
	protected parents = new Map<Controller, BaseModule>();

	/**
	 * A map linking modules to the controllers registered directly under them (not nested).
	 */
	protected modules = new NestedSet<BaseModule, Controller>();

	/**
	 * A map linking constructors of controllers to the modules that use them.
	 */
	protected controllerModules = new NestedSet<Constructor<Controller>, BaseModule>();

	/**
	 * A cache for deeply nested services inside each module.
	 */
	protected modulesNestedCache?: Map<BaseModule, Controller[]>;

	/**
	 * The error manager for this instance.
	 */
	protected errors: ErrorManager;

	public constructor(protected application: Application) {
		this.errors = application.errors.createManager(this);
	}

	/**
	 * Manually registers a controller in the application.
	 * @param controller The controller constructor.
	 * @param module The module under which the controller is to be imported.
	 */
	public register(controller: Constructor<Controller>, module: BaseModule) {
		if (!this.controllers.has(controller)) {
			this.controllers.add(controller);
			this.modulesNestedCache = new Map();
		}

		this.controllerModules.add(controller, module);
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
			const modules = [...this.controllerModules.values(constructor)];

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

		return [...this.globalInstances.values()];
	}

	/**
	 * Resolves the singleton instance of the given service.
	 *
	 * @param controller
	 * @returns
	 */
	 public resolve<T extends Controller>(controller: ControllerToken<T>): T;
	 public resolve<T extends Controller>(controller: ControllerToken<T>, all: true): T[];
	 public resolve<T extends Controller>(controller: ControllerToken<T>, all = false): T | T[] {
		if (isConstructor(controller)) {
			if (!this.controllers.has(controller)) {
				throw new Error(`Attempt to resolve unregistered controller "${controller.name}"`);
			}

			if (!this.instances.hasKey(controller)) {
				this.resolveAll();

				if (!this.instances.hasKey(controller)) {
					throw new Error(`Failed to instantiate controller "${controller.name}"`);
				}
			}

			const available = this.instances.get(controller)!;

			if (all) {
				return [...available] as T[];
			}

			if (available.size > 1) {
				if (available.size > 1) {
					throw new Error(`Multiple instances of controller ${controller.name} are available`);
				}
			}

			return [...available][0] as T;
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
	public getParentModule(controller: Controller<any>) {
		const module = this.parents.get(controller);

		if (module === undefined) {
			throw new Error(
				`Failed to retrieve the module for controller instance "${controller.constructor.name}" because no ` +
				`module was registered in the controller manager`
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
	public getParentModules(controller: Controller<any>) {
		const parents = new Set<BaseModule>();
		let parent = this.parents.get(controller);

		if (parent === undefined) {
			throw new Error(
				`Failed to retrieve the module for controller instance "${controller.constructor.name}" because no ` +
				`module was registered in the controller manager`
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
			const controllers = new Set<Controller>();
			const children = this.application.modules.getChildModules(instance);

			for (const constructor of moduleInstances) {
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
