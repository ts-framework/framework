import { Container } from '@baileyherbert/container';
import { Constructor } from '@baileyherbert/types';
import { Application } from './Application';
import { ApplicationFactoryOptions } from './ApplicationFactoryOptions';

class ApplicationFactoryImpl {

	/**
	 * Creates a new instance of the given application class.
	 *
	 * @param constructor
	 * @returns
	 */
	public async create<T extends Application>(constructor: Constructor<T>, options?: ApplicationFactoryOptions): Promise<T> {
		const container = new Container();
		const instance = container.resolve(constructor);

		container.register(Application, { useValue: instance });
		container.register('app', { useValue: instance });
		container.registerInstance(instance);

		instance.factoryOptions = this.getFactoryOptions(options);
		await instance.boot();

		return instance;
	}

	/**
	 * Applies default settings to the given factory options object.
	 *
	 * @param input
	 * @returns
	 */
	private getFactoryOptions(input: ApplicationFactoryOptions = {}): Required<ApplicationFactoryOptions> {
		input.abortOnError ??= true;
		input.envFilePath ??= '.env';
		input.envPrefix ??= '';
		input.environment ??= {};
		input.loggingLevel ??= true;

		return input as Required<ApplicationFactoryOptions>;
	}

}

/**
 * A factory used to create new application instances.
 */
export const ApplicationFactory = new ApplicationFactoryImpl();
