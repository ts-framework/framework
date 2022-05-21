import { IAttribute, IAttributeInstance, ReflectionClass } from '@baileyherbert/reflection';
import { Constructor } from '@baileyherbert/types';
import { Application } from '../../../application/Application';
import { Component } from '../Attribute';
import { AttributeRegistration } from './AttributeRegistration';

export class ClassAttributeRegistration<T extends IAttribute<any>> implements AttributeRegistration<T> {

	/**
	 * The constructor for the controller or service class.
	 */
	public type: Constructor<Component>;

	/**
	 * The instance of the controller or service class.
	 */
	public target: Component;

	/**
	 * A reflection instance for the target class.
	 */
	public reflection: ReflectionClass<Component>;

	/**
	 * An array of all attribute instances that were applied to the class.
	 */
	public attributes: IAttributeInstance<T>[];

	/**
	 * Constructs a new `ClassAttributeRegistration` instance for the given parameters.
	 * @param application
	 * @param attributes
	 * @param reflection
	 */
	public constructor(application: Application, attributes: IAttributeInstance<T>[], reflection: ReflectionClass<Component>) {
		this.type = reflection.prototype.constructor;
		this.target = application.container.resolve(reflection.target);
		this.reflection = reflection;
		this.attributes = attributes;
	}

	/**
	 * Returns the first attribute instance on the class.
	 * @returns
	 */
	public first(): IAttributeInstance<T> {
		return this.attributes[this.attributes.length - 1];
	}

	/**
	 * Returns the last attribute instance on the class.
	 * @returns
	 */
	public last(): IAttributeInstance<T> {
		return this.attributes[0];
	}

}
