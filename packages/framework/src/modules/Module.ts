import { resolver } from '@baileyherbert/container';
import { Application } from '../application/Application';
import { normalizeLogLevel } from '../utilities/normalizers';
import { BaseModule } from './BaseModule';
import { ImportableModuleWithOptions } from './Importable';
import { ModuleOptions, ModuleOverrideOptions } from './ModuleOptions';

export abstract class Module<T extends BaseModule = Application> extends BaseModule {

	/**
	 * The dependency injection container used to create this module.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The application that this module is attached to.
	 */
	public readonly application = this.container.resolve(Application) as GetApplication<T>;

	/**
	 * The logger for this module.
	 */
	public override readonly logger = this.container.resolve(Application).logger.createChild(this.constructor.name);

	/**
	 * Constructs a new `Module` instance with the given options.
	 * @param options
	 */
	public constructor(options: ModuleOptions) {
		super(options);
		this.logger.level = normalizeLogLevel(options.logging);
	}

	/**
	 * Returns an importable version of the module with the given environment variables.
	 * @param environment
	 * @returns
	 */
	public static withEnvironment(environment: Record<string, any>): ImportableModuleWithOptions {
		return {
			import: this as any,
			environment
		};
	}

	/**
	 * Returns an importable version of the module with the given override options.
	 * @param options
	 * @returns
	 */
	public static withOptions(options: ModuleOverrideOptions): ImportableModuleWithOptions {
		return {
			import: this as any,
			...options
		};
	}

}

type GetApplication<T> = T extends Module<infer U> ? GetApplication<U> : (T extends Application ? T : Application);
