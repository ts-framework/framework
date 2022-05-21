import { IAttribute, IAttributeInstance, ReflectionClass, ReflectionMethod, ReflectionParameter, ReflectionProperty } from '@baileyherbert/reflection';
import { Controller } from '../../../controllers/Controller';
import { Service } from '../../Service';

export interface AttributeRegistration<T extends IAttribute<any>> {

	/**
	 * The instance of the controller or service where this method is defined.
	 */
	target: Service | Controller;

	/**
	 * The attribute instances that were applied to the target.
	 */
	attributes: IAttributeInstance<T>[];

	/**
	 * A reflection instance for the target class.
	 */
	reflection: Reflectable<Service | Controller>;

	/**
	 * Returns the first attribute instance on the class.
	 */
	first(): IAttributeInstance<T>;

	/**
	 * Returns the last attribute instance on the class.
	 */
	last(): IAttributeInstance<T>;

}

type Reflectable<T> = ReflectionClass<T> | ReflectionMethod<T> | ReflectionParameter<T> | ReflectionProperty<T>;
