import { LogLevel } from '@baileyherbert/logging';
import { Constructor } from '@baileyherbert/types';
import { Controller } from '../controllers/Controller';
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
	controllers?: Constructor<Controller>[];

}

/**
 * Describes the module options that can be overridden when importing.
 */
export interface ModuleOverrideOptions {

	/**
	 * Overrides the logging level for this module and its children.
	 */
	logging?: LogLevel | boolean;

	/**
	 * Overrides or sets environment variables for this module.
	 */
	environment?: Record<string, any>;

	/**
	 * Instances of the module as well as its services and controllers will be registered into the dependency injection
	 * container with the specified context. This can be used to discern between instances when a module is imported
	 * multiple times. You can also pass an array of contexts to register multiple at once.
	 *
	 * When importing the module, services, or controllers from a class constructor, you will need to use the `@Context`
	 * decorator with the same value applied here:
	 *
	 * ```ts
	 * constructor(@Context('ctx') public readonly service: ExampleService) {}
	 * ```
	 */
	context?: ModuleContextToken;

}

export type ModuleContextType = (string | symbol | number);
export type ModuleContextToken = ModuleContextType | ModuleContextType[];
