import { NestedSet } from '@baileyherbert/nested-collections';
import { Constructor } from '@baileyherbert/types';
import { Module } from '../modules/Module';
import { FrameworkExtension } from './FrameworkExtension';

class ExtensionRegistryImpl {

	private registrations = new NestedSet<Constructor<Module>, ExtensionRegistration>();

	/**
	 * Registers an association between the given module constructor and the given extension.
	 * @param constructor
	 * @param extension
	 * @param args
	 */
	public register(constructor: Constructor<Module>, extension: Constructor<FrameworkExtension>, args: any[]) {
		this.registrations.add(constructor, {
			module: constructor,
			extension,
			args
		});
	}

	/**
	 * Returns an array of all extensions associated with the given module constructor.
	 * @param constructor
	 * @returns
	 */
	public getRegistrations(constructor: Constructor<Module>) {
		return [...this.registrations.values(constructor)];
	}

}

export const ExtensionRegistry = new ExtensionRegistryImpl();

/**
 * @internal
 */
export interface ExtensionRegistration {
	module: Constructor<Module>;
	extension: Constructor<FrameworkExtension>;
	args: any[];
}
