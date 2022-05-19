import { resolver } from '@baileyherbert/container';
import { Application } from '../application/Application';

export abstract class Controller {

	/**
	 * The dependency injection container for the parent application.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The application that this controller is attached to.
	 */
	public readonly application = this.container.resolve(Application);

	/**
	 * The logger for this controller.
	 */
	public readonly logger = this.application.logger.createChild(this.constructor.name);

}
