import { Logger } from '@baileyherbert/logging';
import { ModuleOptions } from './ModuleOptions';

export abstract class BaseModule {

	/**
	 * The options for this module.
	 * @internal
	 */
	public readonly options: ModuleOptions;

	/**
	 * The logger for this module.
	 */
	public readonly logger: Logger;

	/**
	 * Constructs a new `BaseModule` instance with the given options.
	 * @param options
	 */
	public constructor(options: ModuleOptions) {
		this.options = options;
		this.logger = new Logger();
	}

	/**
	 * Invoked when the module is initially registered in the application.
	 */
	protected onModuleRegister(): Promise<void> | void {

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
