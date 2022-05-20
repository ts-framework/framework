import { resolver } from '@baileyherbert/container';
import { Logger } from '@baileyherbert/logging';
import { NotImplementedError } from '../errors/development/NotImplementedError';
import { BaseModule } from '../modules/BaseModule';
import { normalizeLogLevel } from '../utilities/normalizers';
import { ApplicationOptions } from './ApplicationOptions';
import { ApplicationAttributeManager } from './managers/ApplicationAttributeManager';
import { ApplicationControllerManager } from './managers/ApplicationControllerManager';
import { ApplicationEventManager } from './managers/ApplicationEventManager';
import { ApplicationModuleManager } from './managers/ApplicationModuleManager';
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
	 * The manager for this application's attributes.
	 */
	public readonly attributes: ApplicationAttributeManager;

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
		this.attributes = new ApplicationAttributeManager(this);
	}

	/**
	 * Bootstraps the application if needed.
	 */
	private async bootstrap() {
		if (!this.isBootstrapped) {
			this.isBootstrapped = true;

			// Register modules
			await this.modules.import(this);

			// Register services
			this.services.registerFromModule(this);
			this.services.resolveAll();

			// Register controllers
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
	public async attach() {
		throw new NotImplementedError();
	}

	/**
	 * Starts the application manually.
	 */
	public async start() {
		this.logger.info('Starting the application');

		await this.bootstrap();
		await this.events.init();
		await this.services.startAll();

		await this.modules.startModule(this, false);
		await this.modules.startModule(this, true);
	}

	/**
	 * Stops the application manually.
	 */
	public async stop() {
		this.logger.info('Stopping the application');

		await this.bootstrap();
		await this.services.stopAll();

		await this.modules.stopModule(this, false);
		await this.modules.stopModule(this, true);

		this.modules.clearLifecycleCache();
	}

}
