import { ModuleOptions } from './ModuleOptions';

export abstract class BaseModule {

	/**
	 * The options for this module.
	 * @internal
	 */
	public readonly options: ModuleOptions;

	/**
	 * Constructs a new `BaseModule` instance with the given options.
	 * @param options
	 */
	public constructor(options: ModuleOptions) {
		this.options = options;
	}

}
