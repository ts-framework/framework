import { LogLevel, Transport } from '@baileyherbert/logging';
import { ApplicationStartOptions } from './ApplicationStartOptions';

export interface ApplicationAttachOptions extends ApplicationStartOptions {

	/**
	 * Sets the logging level for the application. When not specified, defaults to `Info` in production and `Debug` in
	 * development. Set to `true` to use the default logging level and `false` to disable logging.
	 */
	loggingLevel?: LogLevel | boolean;

	/**
	 * Sets the transports to use for logging. When not specified, the default console transport will be used.
	 */
	loggingTransports?: Transport<any>[];

	/**
	 * Sets whether the application will listen for and intercept termination signals such as `SIGTERM` to stop the
	 * application gracefully before exiting.
	 * @default true
	 */
	interceptTerminationSignals?: boolean;

}
