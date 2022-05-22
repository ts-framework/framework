import { EnvironmentError, EnvironmentManager } from '@baileyherbert/env';
import { Logger } from '@baileyherbert/logging';
import { ModuleOptions } from './ModuleOptions';

export abstract class BaseModule {

	/**
	 * The options for this module.
	 */
	public readonly options: ModuleOptions;

	/**
	 * The logger for this module.
	 */
	public readonly logger: Logger;

	/**
	 * The cached return value from the `getEnvironment()` method.
	 */
	private _cachedEnvironment?: any;

	/**
	 * The cached environment manager.
	 */
	private _cachedEnvironmentManager?: EnvironmentManager;

	/**
	 * Constructs a new `BaseModule` instance with the given options.
	 * @param options
	 */
	public constructor(options: ModuleOptions) {
		this.options = options;
		this.logger = new Logger();
	}

	/**
	 * Internal method to preload the environment for this module and cache it.
	 * @param env
	 * @internal
	 */
	public _internLoadEnvironment(env: EnvironmentManager) {
		try {
			this._cachedEnvironmentManager = env;
			this._cachedEnvironment = this.onEnvironment(env);
		}
		catch (error) {
			if (error instanceof EnvironmentError) {
				this.logger.error('Failed to initialize environment variables for this module:');

				for (let index = 0; index < error.errors.length; index++) {
					const message = error.errors[index];
					this.logger.error('[%d] %s', index, message);
				}

				process.exit(1);
			}

			throw error;
		}
	}

	/**
	 * Defines the environment variables for this module.
	 * @param env
	 * @returns
	 */
	protected onEnvironment(env: EnvironmentManager) {
		return env.rules({});
	}

	/**
	 * The parsed environment configuration for this module.
	 */
	// @ts-ignore
	public get environment(): ReturnType<this['onEnvironment']> {
		if (this._cachedEnvironment === undefined) {
			throw new Error(`This module's environment is currently unavailable`);
		}

		return this._cachedEnvironment;
	}

	/**
	 * The environment manager for this module.
	 */
	public get env() {
		if (this._cachedEnvironmentManager === undefined) {
			throw new Error(`This module's environment is currently unavailable`);
		}

		return this._cachedEnvironmentManager;
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
