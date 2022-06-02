import { Logger } from '@baileyherbert/logging';
import { Promisable } from '@baileyherbert/types';
import { Application } from '../application/Application';
import { Controller } from '../controllers/Controller';
import { ErrorManager } from '../errors/ErrorManager';
import { Module } from '../modules/Module';
import { Service } from '../services/Service';
import { Composer } from './Composer';
import { ComposerBuilder } from './ComposerBuilder';

/**
 * This is the base class for framework extensions and is required for the implementation of augmented properties
 * and methods on services, controllers, modules, and applications.
 */
export abstract class FrameworkExtension {

	/**
	 * The logger for this extension.
	 */
	public readonly logger = new Logger(this.constructor.name);

	/**
	 * The error manager for this extension.
	 */
	public readonly errors = new ErrorManager(this);

	/**
	 * Invoked when the application instance is constructed. This is only invoked for extensions that are registered
	 * directly into the application via its `extensions` property, and not from the `@ExtensionModule()` decorator.
	 * @param composer
	 */
	protected onApplication(composer: Composer<Application>) {

	}

	/**
	 * Invoked when the extension is registered into the application.
	 * @param builder
	 */
	protected onRegister(builder: ComposerBuilder): Promisable<void> {

	}

	/**
	 * Invokes the `onRegister()` method.
	 * @param application
	 * @returns
	 * @internal
	 */
	public async _internRegister(application: Application) {
		const builder = new ComposerBuilder(application, this);
		return this.onRegister(builder);
	}

	/**
	 * Invokes the `onApplication()` method.
	 * @param composer
	 * @returns
	 * @internal
	 */
	public _internApplication(composer: Composer<Application>) {
		return this.onApplication(composer);
	}

}
