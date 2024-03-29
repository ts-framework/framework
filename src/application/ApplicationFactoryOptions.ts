import { LogLevel } from '@baileyherbert/logging';

export interface ApplicationFactoryOptions {

	/**
	 * Sets the logging level for the application. When not specified, defaults to `Info` in production and `Debug` in
	 * development. Set to `true` to use the default logging level and `false` to disable logging.
	 *
	 * @default true
	 */
	loggingLevel?: LogLevel | boolean;

	/**
	 * Sets whether to terminate the process with an erroneous exit code if an unhandled fatal error is encountered
	 * within the application. Otherwise the `start()` or `attach()` methods will reject with the error.
	 *
	 * @default true
	 */
	abortOnError?: boolean;

	/**
	 * Sets the name or path of the `.env` file to use for configuration. This file does not need to exist, as the
	 * environment will also be loaded from the process. Set to `false` to disable the file entirely.
	 *
	 * @default ".env"
	 */
	envFilePath?: string | false;

	/**
	 * Sets the prefix to use for environment variables in this application. The names of the variables will not change
	 * from the application's perspective, but must contain the prefix in the `.env` file and process environment to
	 * be recognized.
	 *
	 * This is ideal when running multiple applications simultaneously in the same process, in order to isolate their
	 * configurations.
	 *
	 * @default ""
	 */
	envPrefix?: string;

	/**
	 * Sets custom environment variables in the application. The variables defined here will override any conflicting
	 * variables loaded from the working environment or `.env` file.
	 *
	 * @default {}
	 */
	environment?: Record<string, any>;

}
