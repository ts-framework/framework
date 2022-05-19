import { LogLevel } from '@baileyherbert/logging';

export interface ServiceOptions {

	/**
	 * Configures a custom logging level for the service.
	 */
	logging?: LogLevel | boolean;

}
