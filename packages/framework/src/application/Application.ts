import { resolver } from '@baileyherbert/container';
import { EnvironmentManager, FileEnvironmentSource, ProcessEnvironmentSource } from '@baileyherbert/env';
import { ConsoleTransport, Logger, LogLevel } from '@baileyherbert/logging';
import { PromiseCompletionSource } from '@baileyherbert/promises';
import { BaseModule } from '../modules/BaseModule';
import { onExit } from '../utilities/async-exit-hook';
import { normalizeLogLevel } from '../utilities/normalizers';
import { ApplicationAttachOptions } from './ApplicationAttachOptions';
import { ApplicationEnvironment } from './ApplicationEnvironment';
import { ApplicationOptions } from './ApplicationOptions';
import { ApplicationStartOptions } from './ApplicationStartOptions';
import { ApplicationAttributeManager } from './managers/ApplicationAttributeManager';
import { ApplicationControllerManager } from './managers/ApplicationControllerManager';
import { ApplicationEventManager } from './managers/ApplicationEventManager';
import { ApplicationExtensionManager } from './managers/ApplicationExtensionManager';
import { ApplicationModuleManager } from './managers/ApplicationModuleManager';
import { ApplicationRequestManager } from './managers/ApplicationRequestManager';
import { ApplicationServiceManager } from './managers/ApplicationServiceManager';

export abstract class Application extends BaseModule {

	/**
	 * The dependency injection container for the application.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The root logger for the application.
	 */
	public override readonly logger = new Logger(this.constructor.name);

	/**
	 * The options for the application.
	 */
	public override readonly options: ApplicationOptions;

	/**
	 * The manager for this application's modules.
	 */
	public readonly modules: ApplicationModuleManager;

	/**
	 * The manager for this application's services.
	 */
	public readonly services: ApplicationServiceManager;

	/**
	 * The manager for this application's controllers.
	 */
	public readonly controllers: ApplicationControllerManager;

	/**
	 * The manager for this application's events.
	 */
	public readonly events: ApplicationEventManager;

	/**
	 * The manager for this application's requests.
	 */
	public readonly requests: ApplicationRequestManager;

	/**
	 * The manager for this application's attributes.
	 */
	public readonly attributes: ApplicationAttributeManager;

	/**
	 * The manager for this application's extensions.
	 */
	public readonly extensions: ApplicationExtensionManager;

	/**
	 * The options used to start the application.
	 * @internal
	 */
	public startOptions?: Required<ApplicationStartOptions>;

	/**
	 * The environment manager for the application, to be created when it is started.
	 * @internal
	 */
	public environmentManager?: EnvironmentManager;

	/**
	 * A promise source created by the start method which must resolve or reject when the application exits.
	 */
	private startPromiseSource?: PromiseCompletionSource<void>;

	/**
	 * Whether or not the application has been bootstrapped yet.
	 */
	private isBootstrapped: boolean = false;

	/**
	 * Constructs a new `Application` instance with the given options.
	 * @param options
	 */
	public constructor(options: ApplicationOptions) {
		super(options);

		this.options = options;
		this.logger.level = normalizeLogLevel(this.options.logging);

		this.modules = new ApplicationModuleManager(this);
		this.services = new ApplicationServiceManager(this);
		this.controllers = new ApplicationControllerManager(this);
		this.events = new ApplicationEventManager(this);
		this.requests = new ApplicationRequestManager(this);
		this.attributes = new ApplicationAttributeManager(this);
		this.extensions = new ApplicationExtensionManager(this);
	}

	/**
	 * Bootstraps the application if needed.
	 */
	private async bootstrap() {
		if (!this.isBootstrapped) {
			this.isBootstrapped = true;

			// Register extensions
			for (const extension of this.options.extensions ?? []) {
				this.logger.trace('Registering extension:', extension.constructor.name);
				await this.extensions.register(extension);
			}

			// Invoke extension composers
			this.extensions._invokeApplicationComposer(this);

			// Register modules
			this.logger.trace('Registering module imports');
			await this.modules.import(this);

			// Register services
			this.logger.trace('Registering services');
			this.services.registerFromModule(this);
			this.services.resolveAll();

			// Register controllers
			this.logger.trace('Registering controllers');
			this.controllers.registerFromModule(this);
			this.controllers.resolveAll();
		}
	}

	/**
	 * Attaches the application to the current process.
	 *
	 * This will start the application with automatic error handling and graceful shutdown listeners. It will also
	 * end the process with an appropriate error code after shutting down (unless configured otherwise).
	 */
	public async attach(options?: ApplicationAttachOptions) {
		const opts = this.getAttachOptions(options);

		// Set the logging level
		this.logger.level = normalizeLogLevel(opts.loggingLevel, this.getDefaultLogLevel());

		// Attach logging transports
		for (const transport of opts.loggingTransports) {
			transport.attach(this.logger);
		}

		if (opts.interceptTerminationSignals) {
			onExit(async callback => {
				try {
					await this.stop();
					callback();
				}
				catch (error) {
					this.abort(error);
				}
			});
		}

		return this.start(options);
	}

	/**
	 * Starts the application manually.
	 */
	public async start(options?: ApplicationStartOptions) {
		if (this.startPromiseSource) {
			return;
		}

		this.logger.info('Starting the application');
		this.logger.trace('Starting in %s mode', this.mode);

		this.startOptions = this.getStartOptions(options);
		this.startPromiseSource = new PromiseCompletionSource();
		this.environmentManager = this.getEnvironmentManager(this.startOptions);

		this._internCustomEnvironment = this.startOptions.environment ?? {};

		await this.bootstrap();
		await this.events.init();
		await this.requests.init();

		try {
			this.extensions._invokeComposerEvent(this, 'beforeStart');
			await this.services.startAll();
		}
		catch (error) {
			try {
				this.extensions._invokeComposerEvent(this, 'beforeStop');
				await this.services.stopAll();
				this.extensions._invokeComposerEvent(this, 'afterStop');
			}
			catch (_) {}

			this.startPromiseSource = undefined;
			this.abort(error);
		}

		await this.modules.startModule(this, false);
		await this.modules.startModule(this, true);

		this.extensions._invokeComposerEvent(this, 'afterStart');
		this.logger.info('Started the application successfully');

		return this.startPromiseSource.promise;
	}

	/**
	 * Stops the application manually.
	 */
	public async stop() {
		if (!this.startPromiseSource) {
			return;
		}

		this.logger.info('Stopping the application');

		try {
			this.extensions._invokeComposerEvent(this, 'beforeStop');
			await this.services.stopAll();
		}
		catch (error) {
			this.abort(error);
		}

		await this.modules.stopModule(this, false);
		await this.modules.stopModule(this, true);

		this.modules.clearLifecycleCache();

		this.extensions._invokeComposerEvent(this, 'afterStop');
		this.logger.info('Stopped the application successfully');

		this.startPromiseSource?.resolve();
		this.startPromiseSource = undefined;
	}

	/**
	 * Aborts with the given error. If aborting is disabled, throws the error instead.
	 * @param error
	 */
	private abort(error?: any): never {
		if (this.startOptions?.abortOnError) {
			this.logger.error('Aborting application due to a fatal error');
			process.exit(1);
		}

		throw error;
	}

	/**
	 * The current environment mode that the application is running in.
	 */
	public get mode(): ApplicationMode {
		const env = ApplicationEnvironment.NODE_ENV.toLowerCase().trim();

		switch (env) {
			case 'production': return 'production';
			case 'staging': return 'staging';
			case 'testing': return 'testing';
			default: return 'development';
		}
	}

	/**
	 * Returns the attachment options with defaults applied.
	 * @param options
	 * @returns
	 * @internal
	 */
	public getAttachOptions(options?: ApplicationAttachOptions): Required<ApplicationAttachOptions> {
		options ??= {};

		options.abortOnError ??= true;
		options.interceptTerminationSignals ??= true;

		options.loggingLevel ??= this.getDefaultLogLevel();
		options.loggingTransports ??= [
			new ConsoleTransport()
		];

		return options as Required<ApplicationAttachOptions>;
	}

	/**
	 * Returns the start options with defaults applied.
	 * @param options
	 * @returns
	 * @internal
	 */
	public getStartOptions(options?: ApplicationStartOptions): Required<ApplicationStartOptions> {
		options ??= {};

		options.abortOnError ??= true;
		options.envFilePath ??= '.env';
		options.envPrefix ??= '';

		return options as Required<ApplicationStartOptions>;
	}

	/**
	 * Returns the default log level for the current environment.
	 * @returns
	 * @internal
	 */
	public getDefaultLogLevel() {
		return this.mode === 'production' ? LogLevel.Information : LogLevel.Debug;
	}

	/**
	 * Creates the environment manager instance for the given configuration.
	 * @param options
	 * @returns
	 */
	public getEnvironmentManager(options: Required<ApplicationStartOptions>) {
		const sources = [new ProcessEnvironmentSource()];

		if (options.envFilePath !== false) {
			sources.push(new FileEnvironmentSource(options.envFilePath));
		}

		return new EnvironmentManager(sources, options.envPrefix);
	}

}

type ApplicationMode = 'production' | 'staging' | 'testing' | 'development';
