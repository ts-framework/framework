import { resolver } from '@baileyherbert/container';
import { Constructor, Promisable } from '@baileyherbert/types';
import { Application } from '../application/Application';
import { Event } from './events/Event';
import { BaseModule } from '../modules/BaseModule';
import { isConstructor } from '../utilities/types';

export abstract class Service<T extends BaseModule = BaseModule> {

	/**
	 * The dependency injection container for the parent application.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The application that this service is attached to.
	 */
	public readonly application = this.container.resolve(Application);

	/**
	 * The module that this service belongs to.
	 */
	public readonly module = this.application.services.getParentModule(this) as T;

	/**
	 * The logger for this service.
	 */
	public readonly logger = this.module.logger.createChild(this.constructor.name);

	/**
	 * Starts the service.
	 */
	protected abstract start(): Promisable<void>;

	/**
	 * Stops the service.
	 */
	protected abstract stop(): Promisable<void>;

	/**
	 * Starts the service externally.
	 * @internal
	 */
	public async __internStart() {
		await this.start();
	}

	/**
	 * Stops the service externally.
	 * @internal
	 */
	public async __internStop() {
		await this.stop();
	}

	/**
	 * Emits an event of the specified type with the given data.
	 * @param event A reference to the event constructor.
	 * @param data The data to use for the event.
	 */
	protected emit<T>(event: Constructor<Event<T>>, data: T): void;
	protected emit<T>(event: Constructor<Event<void | undefined>>): void;

	/**
	 * Emits the given event.
	 * @param event An event instance.
	 */
	protected emit<T>(event: Event<T>): void;
	protected emit<T>(event: Constructor<Event<T>> | Event<any>, data?: T): void {
		if (isConstructor(event)) {
			event = new event(data, this);
		}

		this.application.events.emit(event);
	}

	/**
	 * Invoked immediately before the first service in the module is started.
	 */
	protected beforeModuleBoot(): Promise<void> | void {

	}

	/**
	 * Invoked after all services in the module have started.
	 */
	protected onModuleBoot(): Promise<void> | void {

	}

	/**
	 * Invoked immediately before the first service in the module is stopped.
	 */
	protected beforeModuleShutdown(): Promise<void> | void {

	}

	/**
	 * Invoked after all services in the module have shut down.
	 */
	protected onModuleShutdown(): Promise<void> | void {

	}

}
