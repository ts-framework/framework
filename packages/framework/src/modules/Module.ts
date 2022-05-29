import { resolver } from '@baileyherbert/container';
import { Promisable } from '@baileyherbert/types';
import { Application } from '../application/Application';
import { normalizeLogLevel } from '../utilities/normalizers';
import { BaseModule } from './BaseModule';
import { ImportableModuleResolver, ImportableModuleWithOptions, ImportableResolverWithOptions } from './Importable';
import { ModuleOptions, ModuleOverrideOptions } from './ModuleOptions';

export abstract class Module<T extends BaseModule = BaseModule> extends BaseModule {

	/**
	 * The dependency injection container used to create this module.
	 */
	public readonly container = resolver.getConstructorInstance();

	/**
	 * The application that this module is attached to.
	 */
	public readonly application: GetApplication<T> = this.container.resolve(Application) as any;

	/**
	 * The logger for this module.
	 */
	public override readonly logger = this.parent.logger.createChild(this.constructor.name);

	/**
	 * The error manager for this module.
	 */
	public override readonly errors = this.parent.errors.createManager(this);

	/**
	 * The extensions that have been loaded into this module.
	 * @internal
	 */
	public _internExtensions = this.application.extensions.augment(this);

	/**
	 * Constructs a new `Module` instance with the given options.
	 * @param options
	 */
	public constructor(options: ModuleOptions) {
		super(options);
		this.logger.level = normalizeLogLevel(options.logging);
	}

	/**
	 * The parent of this module. Relies on the correct type being supplied to `Module<T>`.
	 */
	public get parent(): GetParent<T> {
		return (
			this.container.resolve(Application).modules.getParentModule(this) ??
			this.container.resolve(Application)
		) as any;
	}

	/**
	 * Returns an importable version of the module with the given environment prefix.
	 * @param prefix
	 * @returns
	 */
	public static withEnvironmentPrefix<T extends typeof BaseModule>(this: T, prefix?: string): ImportableModuleWithOptions {
		return {
			import: (application: Application) => {
				return application.container.resolve(this) as Module<any>;
			},
			envPrefix: prefix
		};
	}

	/**
	 * Returns an importable version of the module with the given environment variables.
	 * @param environment
	 * @returns
	 */
	public static withEnvironment<T extends typeof BaseModule>(this: T, environment: EnvironmentType<T>): ImportableModuleWithOptions {
		return {
			import: (application: Application) => {
				return application.container.resolve(this) as Module<any>;
			},
			environment
		};
	}

	/**
	 * Returns an importable version of the module that invokes the given callback and asynchronously waits for it to
	 * return environment variables.
	 * @param this
	 * @param callback
	 * @returns
	 */
	public static withEnvironmentAsync<T extends typeof BaseModule>(this: T, callback: () => Promisable<EnvironmentType<T>>): ImportableModuleResolver {
		return async () => {
			return {
				import: (application: Application) => {
					return application.container.resolve(this) as Module<any>;
				},
				environment: await callback()
			};
		};
	}

	/**
	 * Returns an importable version of the module with the given override options.
	 * @param options
	 * @returns
	 */
	public static withOptions<T extends typeof BaseModule>(this: T, options: TypedModuleOverrideOptions<T>): ImportableResolverWithOptions {
		return {
			import: (application: Application) => {
				return application.container.resolve(this) as Module<any>;
			},
			...options
		};
	}

	/**
	 * Returns an importable version of the module that invokes the given callback and asynchronously waits for it to
	 * return override options.
	 * @param this
	 * @param callback
	 * @returns
	 */
	public static withOptionsAsync<T extends typeof BaseModule>(this: T, callback: () => Promisable<TypedModuleOverrideOptions<T>>): ImportableModuleResolver {
		return async () => {
			return {
				import: (application: Application) => {
					return application.container.resolve(this) as Module<any>;
				},
				...(await callback())
			};
		};
	}

	/**
	 * The parsed environment configuration for this module. Includes configuration from parent modules as well.
	 */
	public override get env(): InheritedEnvironmentType<this, T> {
		return {
			...this.parent._getEnvironmentWithParents(),
			...super.env
		} as any;
	}

	/**
	 * Resolves the environment with that of its parents prepended.
	 * @internal
	 */
	public override _getEnvironmentWithParents() {
		return {
			...this.parent._getEnvironmentWithParents(),
			...this.env
		}
	}

	/**
	 * @internal
	 */
	public override _internGetEnvironmentPrefix() {
		if (this.parent) {
			return this.parent._internGetEnvironmentPrefix() + (this.options.envPrefix ?? '');
		}

		return this.options.envPrefix ?? '';
	}

}

type GetApplication<T> = T extends Module<infer U> ? GetApplication<U> : (T extends Application ? T : Application);
type GetParent<T> = T extends BaseModule ? T : any;
type TypedModuleOverrideOptions<T> = ModuleOverrideOptions & {
	environment?: EnvironmentType<T>;
}

type InnerType<T> = T extends Function & { new (...args: any[]): infer U; } ? U : T;

// @ts-ignore
type ModuleEnvironmentType<T> = T extends BaseModule ? Partial<ReturnType<T['onEnvironment']>> : {};
type EnvironmentMap<T extends {}> = { [key in keyof T]: T[key] | string; };
type MapWithExtras<T extends {}> = T & { [key: string]: any };

type EnvironmentType<T> = MapWithExtras<EnvironmentMap<ModuleEnvironmentType<InnerType<T>>>>;


type InheritedEnvironmentType<T extends Module, P> = (
	// @ts-ignore
	ReturnType<T['onEnvironment']> &
	ParentEnvironmentType<P>
);

type ParentEnvironmentType<T> = T extends BaseModule ? T['env'] : {};
