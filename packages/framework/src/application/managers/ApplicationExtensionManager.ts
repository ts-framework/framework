import { ReflectionClass } from '@baileyherbert/reflection';
import { Constructor, Key } from '@baileyherbert/types';
import { Controller } from '../../controllers/Controller';
import { Composer, ComposerEvents, ComposerTarget } from '../../extensions/Composer';
import { FrameworkExtension } from '../../extensions/FrameworkExtension';
import { Module } from '../../modules/Module';
import { Service } from '../../services/Service';
import { Application } from '../Application';

export class ApplicationExtensionManager {

	protected extensions = new Set<FrameworkExtension>();
	protected types = new Map<Constructor<FrameworkExtension>, FrameworkExtension>();
	protected reflections = new Map<Constructor<any>, ReflectionClass<any>>();
	protected composers = new Map<any, Composer<any>>();

	public constructor(protected application: Application) {

	}

	/**
	 * Registers the given extension into the application.
	 * @param extension
	 */
	public async register(extension: FrameworkExtension) {
		const type = extension.constructor as Constructor<FrameworkExtension>;

		if (!this.types.has(type)) {
			this.types.set(type, extension);
			this.extensions.add(extension);

			// Propagate the extension's utilities into the application
			this.application.logger.attach(extension.logger);
			this.application.errors.attach(extension.errors);

			// Invoke the onRegistered() method
			await extension.onRegister(this.application);
		}
	}

	/**
	 * Returns a boolean indicating whether the given extension type is registered in the application.
	 * @param constructor
	 * @returns
	 */
	public has(constructor: Constructor<FrameworkExtension>) {
		return this.types.has(constructor);
	}

	/**
	 * Returns an instance of the given extension type if it's registered in the application.
	 * @param constructor
	 * @returns
	 */
	public resolve(constructor: Constructor<FrameworkExtension>) {
		return this.types.get(constructor);
	}

	/**
	 * Invokes the `onServiceComposer()` method for all extensions.
	 * @param instance
	 * @internal
	 */
	public _invokeServiceComposer(instance: Service) {
		return this.invokeComposers('onServiceComposer', this.createComposer(instance));
	}

	/**
	 * Invokes the `onControllerComposer()` method for all extensions.
	 * @param instance
	 * @internal
	 */
	public _invokeControllerComposer(instance: Controller) {
		return this.invokeComposers('onControllerComposer', this.createComposer(instance));
	}

	/**
	 * Invokes the `onModuleComposer()` method for all extensions.
	 * @param instance
	 * @internal
	 */
	public _invokeModuleComposer(instance: Module) {
		return this.invokeComposers('onModuleComposer', this.createComposer(instance));
	}

	/**
	 * Invokes the `onApplicationComposer()` method for all extensions.
	 * @param instance
	 * @internal
	 */
	public _invokeApplicationComposer(instance: Application) {
		return this.invokeComposers('onApplicationComposer', this.createComposer(instance));
	}

	/**
	 * Invokes an event on the composer for the given target.
	 * @param instance
	 * @param event
	 * @internal
	 */
	public _invokeComposerEvent<T extends ComposerTarget, K extends Key<ComposerEvents>>(instance: T, event: K) {
		const composer = this.createComposer(instance);
		composer.emit(event);
	}

	/**
	 * Invokes the specified composer callback with the given instance. Returns an array of extensions that were used.
	 * @param event
	 * @param composer
	 * @returns
	 */
	private invokeComposers<K extends Key<CompositionMethods>>(event: K, composer: CompositionMethods[K]) {
		for (const extension of this.extensions) {
			extension[event](composer as any);
		}

		composer._internApply();

		return [...this.extensions];
	}

	/**
	 * Creates and returns a composer for the given instance.
	 * @param instance
	 * @returns
	 */
	private createComposer<T extends object>(instance: T): Composer<T> {
		if (!this.composers.has(instance)) {
			const type = instance.constructor as Constructor<any>;

			if (!this.reflections.has(type)) {
				this.reflections.set(type, new ReflectionClass(instance));
			}

			const composer = new Composer(instance, this.reflections.get(type)!);
			this.composers.set(instance, composer);
		}

		return this.composers.get(instance)!;
	}

}

type CompositionMethods = {
	onServiceComposer: Composer<Service>;
	onControllerComposer: Composer<Controller>;
	onModuleComposer: Composer<Module>;
	onApplicationComposer: Composer<Application>;
}
