import { IAttribute, IAttributeInstance, ReflectionParameter } from '@baileyherbert/reflection';
import { Application } from '../../../application/Application';
import { Component } from '../Attribute';
import { AttributeRegistration } from './AttributeRegistration';

export class ParameterAttributeRegistration<T extends IAttribute<any>> implements AttributeRegistration<T> {

	/**
	 * The instance of the controller or service where this method is defined.
	 */
	public target: Component;

	/**
	 * The name of the parent method.
	 */
	public methodName: string;

	/**
	 * The name of the parameter (as defined in the code).
	 */
	public parameterName: string;

	/**
	 * The index of the parameter (starts at 0).
	 */
	public parameterIndex: number;

	/**
	 * A reflection instance for the target parameter.
	 */
	public reflection: ReflectionParameter<Component>;

	/**
	 * An array of all attribute instances that were applied to the method.
	 */
	public attributes: IAttributeInstance<T>[];

	/**
	 * Constructs a new `ParameterAttributeRegistration` instance for the given parameters.
	 * @param application
	 * @param attributes
	 * @param reflection
	 */
	public constructor(application: Application, attributes: IAttributeInstance<T>[], reflection: ReflectionParameter<Component>) {
		this.target = application.container.resolve(reflection.method.class.target);
		this.methodName = reflection.method.name;
		this.parameterName = reflection.name;
		this.parameterIndex = reflection.index;
		this.reflection = reflection;
		this.attributes = attributes;
	}

	/**
	 * Returns the first attribute instance on the method.
	 * @returns
	 */
	public first(): IAttributeInstance<T> {
		return this.attributes[this.attributes.length - 1];
	}

	/**
	 * Returns the last attribute instance on the method.
	 * @returns
	 */
	public last(): IAttributeInstance<T> {
		return this.attributes[0];
	}

}
