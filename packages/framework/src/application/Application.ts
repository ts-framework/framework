import { Container, resolver } from '@baileyherbert/container';
import { Logger } from '@baileyherbert/logging';
import { NotImplementedError } from '../errors/development/NotImplementedError';
import { ApplicationServiceManager } from '../main';
import { BaseModule } from '../modules/BaseModule';
import { normalizeLogLevel } from '../utilities/normalizers';
import { ApplicationOptions } from './ApplicationOptions';
import { ApplicationModuleManager } from './managers/ApplicationModuleManager';

export abstract class Application extends BaseModule {

	/**
	 * The dependency injection container for the application.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The root logger for the application.
	 */
	public readonly logger = new Logger(this.constructor.name);

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
		await this.bootstrap();
		await this.services.startAll();
	}

	/**
	 * Stops the application manually.
	 */
	public async stop() {
		await this.bootstrap();
		await this.services.stopAll();
	}

}
