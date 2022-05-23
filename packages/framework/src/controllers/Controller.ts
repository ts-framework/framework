import { resolver } from '@baileyherbert/container';
import { Application } from '../application/Application';
import { BaseModule } from '../modules/BaseModule';
import { Module } from '../modules/Module';

export abstract class Controller<T extends BaseModule = BaseModule> {

	/**
	 * The dependency injection container for the parent application.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The application that this controller is attached to.
	 */
	public readonly application = this.container.resolve(Application) as GetApplication<T>;

	/**
	 * The module that this controller belongs to.
	 */
	public readonly module = this.application.controllers.getParentModule(this) as T;

	/**
	 * The logger for this controller.
	 */
	public readonly logger = this.module.logger.createChild(this.constructor.name);

}

type GetApplication<T> = T extends Module<infer P> ? GetApplication<P> : (T extends Application ? T : Application);

