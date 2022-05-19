import { Container } from '@baileyherbert/container';
import { Logger } from '@baileyherbert/logging';
import { NotImplementedError } from '../errors/development/NotImplementedError';
import { Module } from '../modules/Module';
import { normalizeLogLevel } from '../utilities/normalizers';
import { ApplicationOptions } from './ApplicationOptions';

export abstract class Application extends Module {

	/**
	 * The dependency injection container for the application.
	 */
	public container: Container;

	/**
	 * The root logger for the application.
	 */
	public logger: Logger;

	/**
	 * The options for the application.
	 */
	public override readonly options: ApplicationOptions;

	/**
	 * Constructs a new `Application` instance with the given options.
	 * @param options
	 */
	public constructor(options: ApplicationOptions) {
		super(options);

		this.options = options;
		this.logger = new Logger(this.constructor.name, normalizeLogLevel(this.options.logging));
		this.container = new Container();
		this.container.registerInstance(Application, this);
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
