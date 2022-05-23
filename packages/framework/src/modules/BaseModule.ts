import { EnvironmentError, EnvironmentManager } from '@baileyherbert/env';
import { Logger } from '@baileyherbert/logging';
import { Application } from '../application/Application';
import { RecordEnvironmentSource } from '../utilities/env/RecordEnvironmentSource';
import { ModuleContextToken, ModuleOptions } from './ModuleOptions';

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
	 * The internal environment variable overrides from module import.
	 * @internal
	 */
	public _internCustomEnvironment: Record<string, any> = {};

	/**
	 * The additional context to register this module and its children under.
	 * @internal
	 */
	public _internContext?: ModuleContextToken;

	/**
	 * Whether or not this module has multiple instances.
	 * @internal
	 */
	public _internMultipleInstances = false;

	/**
	 * Constructs a new `BaseModule` instance with the given options.
	 * @param options
	 */
	public constructor(options: ModuleOptions) {
		this.options = options;
		this.logger = new Logger();
	}

	private _getCustomEnvironmentSources(application: Application) {
		const sources = [
			new RecordEnvironmentSource(this._internCustomEnvironment)
		];

		const parent = application.modules.getParentModule(this);

		if (parent) {
			sources.push(...parent._getCustomEnvironmentSources(application));
		}

		return sources;
	}

	/**
	 * Internal method to preload the environment for this module and cache it.
	 * @param env
	 * @internal
	 */
	public _internLoadEnvironment(application: Application, env: EnvironmentManager) {
		try {
			const internalSources = this._getCustomEnvironmentSources(application);
			const internalEnv = new EnvironmentManager([
				...internalSources,
				...env.sources
			]);

			this._cachedEnvironmentManager = internalEnv;
			this._cachedEnvironment = this.onEnvironment(internalEnv);
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
	public get env(): EnvironmentType<this> {
		if (this._cachedEnvironment === undefined) {
			throw new Error(`This module's environment is currently unavailable`);
		}

		return this._cachedEnvironment;
	}

	/**
	 * The environment manager for this module.
	 */
	public get environment() {
		if (this._cachedEnvironmentManager === undefined) {
			throw new Error(`This module's environment is currently unavailable`);
		}

		return this._cachedEnvironmentManager;
	}

	/**
	 * Resolves the environment for the given manager.
	 * @param manager
	 * @internal
	 */
	public _getEnvironmentFor(manager: EnvironmentManager) {
		return this.onEnvironment(manager);
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

// @ts-ignore
type EnvironmentType<T extends BaseModule> = ReturnType<T['onEnvironment']>;
