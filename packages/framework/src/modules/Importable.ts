import { Action, Constructor, Promisable } from '@baileyherbert/types';
import { Module } from './Module';
import { ModuleOverrideOptions } from './ModuleOptions';

/**
 * Describes an importable module as a class constructor or instance.
 */
export type ImportableModule = Constructor<Module> | Module;

/**
 * Describes a function that returns or resolves to an importable module.
 */
export type ImportableModuleResolver = Action<Promisable<ImportableModule>>;

/**
 * Describes an object that contains the module to import as well as options to override on said module.
 */
export type ImportableModuleWithOptions = ModuleOverrideOptions & {
	import: ImportableModule | ImportableModuleResolver;
}

/**
 * Describes all possible types that can be used to import a module.
 */
export type Importable = ImportableModule | ImportableModuleResolver | ImportableModuleWithOptions;
