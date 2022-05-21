import { IAttribute } from '@baileyherbert/reflection';
import { AttributeRegistry } from '../../services/attributes/AttributeRegistry';
import { Application } from '../Application';

export class ApplicationAttributeManager {

	public constructor(protected application: Application) {}

	/**
	 * Returns all methods in the application which have the specified service attribute applied.
	 * @param attribute
	 */
	public getMethods<T extends IAttribute<any>>(attribute: T) {
		return AttributeRegistry.getMethods(this.application, attribute);
	}

	/**
	 * Returns all classes in the application which have the specified service attribute applied.
	 * @param attribute
	 */
	public getClasses<T extends IAttribute<any>>(attribute: T) {
		return AttributeRegistry.getClasses(this.application, attribute);
	}

	/**
	 * Returns all parameters in the application which have the specified service attribute applied.
	 * @param attribute
	 */
	public getParameters<T extends IAttribute<any>>(attribute: T) {
		return AttributeRegistry.getParameters(this.application, attribute);
	}

	/**
	 * Returns all properties in the application which have the specified service attribute applied.
	 * @param attribute
	 */
	public getProperties<T extends IAttribute<any>>(attribute: T) {
		return AttributeRegistry.getProperties(this.application, attribute);
	}

}
