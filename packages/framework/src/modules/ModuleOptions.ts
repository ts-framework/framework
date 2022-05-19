import { LogLevel } from '@baileyherbert/logging';
import { Constructor } from '@baileyherbert/types';
import { Service } from '../services/Service';
import { Importable } from './Importable';

export interface ModuleOptions extends ModuleOverrideOptions {

	/**
	 * The name of the module.
	 */
	name?: string;

	/**
	 * The description of the module.
	 */
	description?: string;

	/**
	 * An array of modules to import.
	 */
	imports?: Importable[];

	/**
	 * An array of service classes to register as a part of this module.
	 */
	services?: Constructor<Service>[];

	/**
	 * An array of controller classes to register as a part of this module.
	 */
	controllers?: Constructor<'TODO'>[];

}

/**
 * Describes the module options that can be overridden when importing.
 */
export interface ModuleOverrideOptions {

	/**
	 * Overrides the logging level for this module and its children.
	 */
	logging?: LogLevel | boolean;

}
