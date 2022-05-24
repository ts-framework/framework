import { FrameworkExtension } from '../extensions/FrameworkExtension';
import { ModuleOptions } from '../modules/ModuleOptions';

export interface ApplicationOptions extends ModuleOptions {

	/**
	 * The extensions to load into the application.
	 */
	extensions?: FrameworkExtension[];

}
