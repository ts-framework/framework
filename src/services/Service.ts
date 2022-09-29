import { resolver } from '@baileyherbert/container';
import { Constructor, Promisable } from '@baileyherbert/types';
import { Application } from '../application/Application';
import { Event } from './events/Event';
import { BaseModule } from '../modules/BaseModule';
import { isConstructor } from '../utilities/types';
import { Module } from '../modules/Module';
import { PromiseManager } from './promises/PromiseManager';
import { ScheduleManager } from './scheduler/ScheduleManager';
import { StateManager } from './state/StateManager';

export abstract class Service<T extends BaseModule = BaseModule> {

	/**
	 * The dependency injection container for the parent application.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The application that this service is attached to.
	 */
	public readonly application = this.container.resolve('app') as GetApplication<T>;

	/**
	 * The module that this service belongs to.
	 */
	public readonly module = this.container.getContext('_tsfw_parentModuleContext')(this) as T;

	/**
	 * The logger for this service.
	 */
	public readonly logger = this.module.logger.createChild(this.constructor.name);

	/**
	 * The error manager for this service.
	 */
	public readonly errors = this.module.errors.createManager(this);

	/**
	 * The promise manager for this service.
	 */
	protected readonly promises: PromiseManager = new PromiseManager(this);

	/**
	 * The schedule manager for this service.
	 */
	protected readonly scheduler: ScheduleManager = new ScheduleManager(this);

	/**
	 * The state manager for this service.
	 */
	protected readonly state: StateManager = new StateManager(this);

	/**
	 * The extensions that have been loaded into this service.
	 * @internal
	 */
	public _internExtensions = this.application.extensions.augment(this);

	/**
	 * An array of property names on this instance that represent managed state.
	 * @internal
	 */
	public _internManagedProperties?: string[];

	/**
	 * Invoked immediately before the service is started for the first time to register attributes and perform any
	 * other one-time operations. This method will not be called again for the duration of the process.
	 */
	protected register(): Promisable<void> {}

	/**
	 * Starts the service.
	 */
	protected start(): Promisable<void> {}

	/**
	 * Stops the service.
	 */
	protected stop(): Promisable<void> {}

	/**
	 * Registers the service externally.
	 * @internal
	 */
	public async __internRegister() {
		if (!this._internManagedProperties) {
			this.state._initialize();
		}

		await this.register();
	}

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
		await this.scheduler.clearAll();
		await this.stop();

		if (this.promises.size > 0) {
			this.logger.info(
				'Waiting for %d promise%s to finish before stopping',
				this.promises.size,
				this.promises.size === 1 ? '' : 's'
			);

			if (!await this.promises.waitAll()) {
				this.logger.warning(
					'Timed out: There %s still %d promise%s outstanding',
					this.promises.size === 1 ? 'was' : 'were',
					this.promises.size,
					this.promises.size === 1 ? '' : 's'
				);
			}
		}

		this.state.clear();
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

type GetApplication<T> = T extends Module<infer P> ? GetApplication<P> : (T extends Application ? T : Application);
