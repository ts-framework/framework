import { Container, resolver } from '@baileyherbert/container';
import { Logger } from '@baileyherbert/logging';
import { NotImplementedError } from '../errors/development/NotImplementedError';
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
	 * Whether or not the application has been bootstrapped yet.
	 */
	private isBootstrapped: boolean = false;

	/**
	 * The manager for this application's modules.
	 */
	public readonly modules: ApplicationModuleManager;

	/**
	 * Constructs a new `Application` instance with the given options.
	 * @param options
	 */
	public constructor(options: ApplicationOptions) {
		super(options);

		this.options = options;
		this.logger.level = normalizeLogLevel(this.options.logging);

		this.modules = new ApplicationModuleManager(this);
	}

	/**
	 * Bootstraps the application if needed.
	 */
	private async bootstrap() {
		if (!this.isBootstrapped) {
			this.isBootstrapped = true;

			await this.modules.import(this);
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
		throw new NotImplementedError();
	}

	/**
	 * Stops the application manually.
	 */
	public async stop() {
		throw new NotImplementedError();
	}

}
