import { ModuleOptions } from './ModuleOptions';

export abstract class Module {

	/**
	 * The options for this module.
	 * @internal
	 */
	public readonly options: ModuleOptions;

	/**
	 * Constructs a new `Module` instance with the given options.
	 * @param options
	 */
	public constructor(options: ModuleOptions) {
		this.options = options;
	}

}
