import { Container } from '@baileyherbert/container';
import { Constructor } from '@baileyherbert/types';
import { Application } from './Application';

class ApplicationFactoryImpl {

	/**
	 * Creates a new instance of the given application class.
	 *
	 * @param constructor
	 * @returns
	 */
	public create<T extends Application>(constructor: Constructor<T>): T {
		const container = new Container();
		const instance = container.resolve(constructor);

		container.register(Application, { useValue: instance });
		container.register('app', { useValue: instance });
		container.registerInstance(instance);

		return instance;
	}

}

/**
 * A factory used to create new application instances.
 */
export const ApplicationFactory = new ApplicationFactoryImpl();
