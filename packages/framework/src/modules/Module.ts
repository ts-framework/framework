import { resolver } from '@baileyherbert/container';
import { Application } from '../application/Application';
import { normalizeLogLevel } from '../utilities/normalizers';
import { BaseModule } from './BaseModule';
import { ModuleOptions } from './ModuleOptions';

export abstract class Module extends BaseModule {

	/**
	 * The dependency injection container used to create this module.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The application that this module is attached to.
	 */
	public readonly application = this.container.resolve(Application);

	/**
	 * The logger for this module.
	 */
	public override readonly logger = this.application.logger.createChild(this.constructor.name);

	/**
	 * Constructs a new `Module` instance with the given options.
	 * @param options
	 */
	public constructor(options: ModuleOptions) {
		super(options);
		this.logger.level = normalizeLogLevel(options.logging);
	}

}
