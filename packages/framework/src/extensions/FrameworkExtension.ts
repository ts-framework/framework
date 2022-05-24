import { Logger } from '@baileyherbert/logging';
import { Application } from '../application/Application';
import { Controller } from '../controllers/Controller';
import { Module } from '../modules/Module';
import { Service } from '../services/Service';
import { Composer } from './Composer';

/**
 * This is the base class for framework extensions and is required for the implementation of augmented properties
 * and methods on services, controllers, modules, and applications.
 */
export abstract class FrameworkExtension {

	/**
	 * The logger for this extension.
	 */
	public logger = new Logger(this.constructor.name);

	/**
	 * Invoked from the constructor of new services.
	 * @param composer
	 */
	public onServiceComposer(composer: Composer<Service>) {

	}

	/**
	 * Invoked from the constructor of new controllers.
	 * @param composer
	 */
	public onControllerComposer(composer: Composer<Controller>) {

	}

	/**
	 * Invoked from the constructor of new modules.
	 * @param composer
	 */
	public onModuleComposer(composer: Composer<Module>) {

	}

	/**
	 * Invoked from the constructor of new application modules.
	 * @param composer
	 */
	public onApplicationComposer(composer: Composer<Application>) {

	}

	/**
	 * Invoked when the extension is registered into the application.
	 * @param application
	 */
	public async onRegister(application: Application) {

	}

}
