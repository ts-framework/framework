import { resolver } from '@baileyherbert/container';
import { EnvironmentManager, FileEnvironmentSource, ProcessEnvironmentSource } from '@baileyherbert/env';
import { ConsoleTransport, Logger, LogLevel, Transport } from '@baileyherbert/logging';
import { PromiseCompletionSource } from '@baileyherbert/promises';
import { ErrorEvent } from '../errors/ErrorEvent';
import { ErrorManager } from '../errors/ErrorManager';
import { UncaughtError } from '../errors/kinds/UncaughtError';
import { AbortError } from '../errors/lifecycles/AbortError';
import { FrameworkError } from '../errors/lifecycles/FrameworkError';
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
	 * The root error manager for the application.
	 */
	public override readonly errors = new ErrorManager(this);

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
	 * Whether or not the application has been bootstrapped yet.
	 */
	private isBootstrapped: boolean = false;

	private appActive: boolean = false;
	private appStopPending: boolean = false;

	private appStartupSource?: PromiseCompletionSource<void>;
	private appRuntimeSource?: PromiseCompletionSource<boolean>;
	private appShutdownSource?: PromiseCompletionSource<void>;

	private _initialTransports: Transport[];
	private _initialLoggingLevel?: LogLevel;

	/**
	 * Constructs a new `Application` instance with the given options.
	 * @param options
	 */
	public constructor(options: ApplicationOptions) {
		super(options);

		this.options = options;
		this.logger.level = normalizeLogLevel(this.options.logging);
		this.logger.buffer = true;

		this.modules = new ApplicationModuleManager(this);
		this.services = new ApplicationServiceManager(this);
		this.controllers = new ApplicationControllerManager(this);
		this.events = new ApplicationEventManager(this);
		this.requests = new ApplicationRequestManager(this);
		this.attributes = new ApplicationAttributeManager(this);
		this.extensions = new ApplicationExtensionManager(this);

		this._initialTransports = [...this.logger.transports];
		this._initialLoggingLevel = this.logger.level;

		// Allow construction-time augmentation from extensions
		this.extensions.construct(this.options.extensions ?? []);
	}

	/**
	 * Attaches the application to the current process.
	 *
	 * This will start the application with automatic error handling and graceful shutdown listeners. It will also
	 * end the process with an appropriate error code after shutting down (unless configured otherwise).
	 */
	public async attach(options?: ApplicationAttachOptions) {
		// Guard against attaching again while running
		if (this.appActive) {
			throw new Error('Cannot attach because the application is already active');
		}

		const opts = this.getAttachOptions(options);

		// Set the logging level
		this.logger.level = normalizeLogLevel(opts.loggingLevel, this.getDefaultLogLevel());

		// Attach logging transports
		for (const transport of opts.loggingTransports) {
			transport.attach(this.logger);
		}

		if (opts.interceptTerminationSignals && typeof process !== 'undefined') {
			onExit(async callback => {
				try {
					await this.stop();
					callback();
				}
				catch (error) {
					if (!(error instanceof AbortError)) {
						this.errors.emitCriticalError(new UncaughtError(), error);
					}

					this.logger.critical('Terminating process due to error on shutdown');
					process.exit(1);
				}
			});
		}

		return this.start(options);
	}

	/**
	 * Bootstraps the application. This is called automaticaly when starting or attaching the application, but you
	 * can also invoke it manually depending on your needs. It's safe to invoke this method more than once, as
	 * subsequent calls will be ignored (and will immediately resolve).
	 * @returns
	 */
	public async bootstrap() {
		return this.boot();
	}

	/**
	 * Starts the application. Returns a promise which resolves once the application has stopped.
	 * @param options
	 * @returns
	 */
	public async start(options?: ApplicationAttachOptions) {
		// Guard against starting multiple times at once
		if (this.appActive) return;
		this.appActive = true;

		this.logger.flush(true);
		this.logger.info('Starting the application');
		this.logger.trace('Starting in %s mode', this.mode);

		this.startOptions = this.getStartOptions(options);
		this.environmentManager = this.getEnvironmentManager(this.startOptions);
		this._internCustomEnvironment = this.startOptions.environment ?? {};

		try {
			if (await this.boot()) {
				const result = await this.run();
				await this.shutdown();

				if (!result) {
					throw new AbortError();
				}
			}

			this.resetInternals();
		}
		catch (error) {
			this.resetInternals();

			// Terminate the process if abortOnError is enabled
			if (this.startOptions.abortOnError) {
				this.logger.critical('Application stopped due to a critical error');
				process.exit(1);
			}

			// Throw a generic error for aborts
			// The underlying error will have been logged in the error manager
			if (error instanceof AbortError) {
				throw new FrameworkError('Application stopped due to a critical error');
			}

			// When abortOnError is disabled, throw the uncaught error back at the caller
			throw error;
		}
	}

	/**
	 * Bootstraps the application. Returns a boolean indicating success.
	 * @returns
	 */
	private async boot(): Promise<boolean> {
		try {
			if (this.isBootstrapped) return true;
			this.isBootstrapped = true;

			this.logger.trace('Starting application bootstrap for first run');

			// Attach error handling
			this.errors.on('passive', event => this.handleError(LogLevel.Error, event));
			this.errors.on('critical', event => this.handleError(LogLevel.Critical, event));

			// Preload the root environment for extensions
			this._internLoadEnvironment(this, this.environmentManager!);

			// Initialize extensions from options and root modules
			await this.bootExtensions();

			// Invoke extension composers
			this.extensions.augment(this);

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

			return true;
		}
		catch (error) {
			if (!(error instanceof AbortError)) {
				this.errors.emitCriticalError(new UncaughtError(), error);
			}

			return false;
		}
	}

	/**
	 * Runs the application and returns a promise that resolves once the application is ready to stop.
	 */
	private async run() {
		try {
			// Set promises that resolve when the application finishes its startup and shutdown
			this.appStartupSource = new PromiseCompletionSource<void>();
			this.appShutdownSource = new PromiseCompletionSource<void>();

			// Initialize event and request handlers
			await this.events.init();
			await this.requests.init();

			// Start all services
			this.extensions._invokeComposerEvent(this, 'beforeStart');
			await this.services.startAll();

			// Start remaining modules
			// This is required to catch modules that have no services
			await this.modules.startModule(this, false);
			await this.modules.startModule(this, true);

			// Finish startup
			this.extensions._invokeComposerEvent(this, 'afterStart');
			this.logger.info('Started the application successfully');

			// Resolve the app startup promise
			this.appStartupSource.resolve();
			this.appStartupSource = undefined;

			// Return a promise that resolves when the application stops
			this.appRuntimeSource = new PromiseCompletionSource();
			return this.appRuntimeSource.promise;
		}
		catch (error) {
			if (!(error instanceof AbortError)) {
				this.errors.emitCriticalError(new UncaughtError(), error);
			}

			return false;
		}
	}

	/**
	 * Shuts down the application gracefully.
	 * @returns
	 */
	private async shutdown(): Promise<void> {
		if (!this.appActive) return;
		if (this.appStopPending) return this.appShutdownSource!.promise;
		if (this.appStartupSource) {
			await this.appStartupSource.promise;
			return this.shutdown();
		}

		try {
			this.appStopPending = true;
			this.logger.info('Stopping the application');

			this.extensions._invokeComposerEvent(this, 'beforeStop');
			await this.services.stopAll();

			await this.modules.stopModule(this, false);
			await this.modules.stopModule(this, true);

			this.modules.clearLifecycleCache();

			this.extensions._invokeComposerEvent(this, 'afterStop');
			this.logger.info('Stopped the application successfully');
		}
		catch (error) {
			if (!(error instanceof AbortError)) {
				this.errors.emitCriticalError(new UncaughtError(), error);
			}
		}
		finally {
			this.appActive = false;
			this.appStopPending = false;
			this.appShutdownSource?.resolve();
			this.appShutdownSource = undefined;
		}
	}

	/**
	 * Bootstraps the application's extensions.
	 */
	private async bootExtensions() {
		// Register extensions from options
		for (const extension of this.options.extensions ?? []) {
			this.logger.trace('Registering extension:', extension.constructor.name);
			await this.extensions.register(extension);
		}

		// Register extensions from modules
		for (const registration of await this.modules._getExtensions()) {
			if (!this.extensions.has(registration.extension)) {
				this.logger.trace(
					'Registering extension:',
					registration.extension.name,
					`(from module ${registration.module.name})`
				);

				await this.extensions.register(new registration.extension(...registration.args));
			}
		}
	}

	/**
	 * Requests the application to gracefully stop.
	 */
	public async stop() {
		if (this.appStopPending) {
			return this.appShutdownSource!.promise;
		}

		if (this.appRuntimeSource) {
			this.appRuntimeSource.resolve(true);
			this.appRuntimeSource = undefined;

			return this.appShutdownSource!.promise;
		}
	}

	/**
	 * Resets the internal state of the application.
	 */
	private resetInternals() {
		// Reset state
		this.appActive = false;
		this.appStopPending = false;
		this.appRuntimeSource = undefined;
		this.appShutdownSource = undefined;
		this.appStartupSource = undefined;

		// Reset the logging level
		this.logger.level = this._initialLoggingLevel;

		// Detach all transports
		for (const transport of this.logger.transports) {
			transport.detach(this.logger);
		}

		// Reattach default transports
		for (const transport of this._initialTransports) {
			transport.attach(this.logger);
		}
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

		if (options.envFilePath !== false && typeof process !== 'undefined') {
			sources.push(new FileEnvironmentSource(options.envFilePath));
		}

		return new EnvironmentManager(sources, options.envPrefix);
	}

	/**
	 * Handles errors from the root manager and sends them to their respective loggers.
	 * @param level
	 * @param event
	 */
	private handleError(level: LogLevel, event: ErrorEvent) {
		this.printError(level, event);

		// Stop the application when a critical error occurs
		if (level === LogLevel.Critical) {
			if (this.appRuntimeSource) {
				this.appRuntimeSource.resolve(false);
				this.appRuntimeSource = undefined;
			}
		}
	}

	/**
	 * Prints the given error to the logger.
	 * @param level
	 * @param event
	 */
	private printError(level: LogLevel, event: ErrorEvent) {
		if (ErrorEvent.canOutput(event)) {
			if (this.hasLogger(event.sender)) {
				event.sender.logger.write(level, event.toString());
			}
			else {
				this.logger.write(level, event.toString());
			}
		}
	}

	/**
	 * Returns true if the given object has a `logger` property.
	 * @param sender
	 * @returns
	 */
	private hasLogger(sender: any): sender is IHasLogger {
		if ('logger' in sender) {
			if (sender.logger instanceof Logger) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @internal
	 */
	public override _internGetEnvironmentPrefix() {
		return this.startOptions?.envPrefix ?? '';
	}

}

type ApplicationMode = 'production' | 'staging' | 'testing' | 'development';
type IHasLogger = {
	logger: Logger;
}
