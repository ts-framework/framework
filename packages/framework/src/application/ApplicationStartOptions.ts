export interface ApplicationStartOptions {

	/**
	 * Sets whether to terminate the process with an erroneous exit code if an unhandled fatal error is encountered
	 * within the application. Otherwise the `start()` or `attach()` methods will reject with the error.
	 * @default true
	 */
	abortOnError?: boolean;

}
