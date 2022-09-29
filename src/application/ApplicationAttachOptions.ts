import { Transport } from '@baileyherbert/logging';

export interface ApplicationAttachOptions {

	/**
	 * Sets the transports to use for logging. When not specified, the default console transport will be used.
	 */
	loggingTransports?: Transport<any>[];

	/**
	 * Sets whether the application will listen for and intercept termination signals such as `SIGTERM` to stop the
	 * application gracefully before exiting.
	 *
	 * @default true
	 */
	interceptTerminationSignals?: boolean;

}
