import { NestedSet } from '@baileyherbert/nested-collections';
import { ReflectionClass } from '@baileyherbert/reflection';
import { Constructor, Key, Type } from '@baileyherbert/types';
import { Composer, ComposerEvents, ComposerTarget } from '../../extensions/Composer';
import { FrameworkExtension } from '../../extensions/FrameworkExtension';
import { Application } from '../Application';

export class ApplicationExtensionManager {

	protected extensions = new Set<FrameworkExtension>();
	protected types = new Map<Type<FrameworkExtension>, FrameworkExtension>();
	protected reflections = new Map<Type<any>, ReflectionClass<any>>();
	protected composers = new Map<any, Composer<any>>();

	protected registrations = new NestedSet<Type<any>, ComposerRegistration<any>>();

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

			// Invoke the onRegister() method
			await extension._internRegister(this.application);
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
	 * Invokes composers on the given instance and returns an array of extensions that were applied.
	 * @param instance
	 * @returns
	 */
	public augment(instance: object) {
		const types = this.getReflection(instance).getHierarchy().map(ref => ref.target);
		const extensions = new Set<FrameworkExtension>();

		for (const type of types) {
			if (this.registrations.hasKey(type)) {
				const composer = this.createComposer(instance);
				const registrations = this.registrations.values(type);

				for (const registration of registrations) {
					registration.handler(composer);
					extensions.add(registration.extension);
				}

				composer._internApply();
			}
		}

		return [...extensions];
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
	 * Returns a reflection object for the given instance (with caching).
	 * @param instance
	 * @returns
	 */
	private getReflection<T extends object>(instance: T): ReflectionClass<T> {
		const type = instance.constructor as Type<any>;

		if (!this.reflections.has(type)) {
			this.reflections.set(type, new ReflectionClass(instance));
		}

		return this.reflections.get(type)!;
	}

	/**
	 * Creates and returns a composer for the given instance.
	 * @param instance
	 * @returns
	 */
	private createComposer<T extends object>(instance: T): Composer<T> {
		if (!this.composers.has(instance)) {
			const composer = new Composer(instance, this.getReflection(instance));
			this.composers.set(instance, composer);
		}

		return this.composers.get(instance)!;
	}

	/**
	 * Attaches a composer handler to the manager.
	 * @param extension
	 * @param constructor
	 * @param handler
	 * @internal
	 */
	public _attachComposer<T extends object>(extension: FrameworkExtension, constructor: Type<T>, handler: ComposerHandler<T>) {
		this.registrations.add(constructor, {
			extension,
			handler
		});
	}

}

type ComposerHandler<T extends object> = (composer: Composer<T>) => any;

interface ComposerRegistration<T extends object> {
	extension: FrameworkExtension;
	handler: ComposerHandler<T>;
}
