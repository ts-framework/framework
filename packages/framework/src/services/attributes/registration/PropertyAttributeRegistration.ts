import { IAttribute, IAttributeInstance, ReflectionProperty } from '@baileyherbert/reflection';
import { Application } from '../../../application/Application';
import { Component } from '../Attribute';
import { AttributeRegistration } from './AttributeRegistration';

export class PropertyAttributeRegistration<T extends IAttribute<any>> implements AttributeRegistration<T> {

	/**
	 * The instance of the controller or service where this property is defined.
	 */
	public target: Component;

	/**
	 * The name of the property.
	 */
	public propertyName: string;

	/**
	 * A reflection instance for the target property.
	 */
	public reflection: ReflectionProperty<Component>;

	/**
	 * An array of all attribute instances that were applied to the property.
	 */
	public attributes: IAttributeInstance<T>[];

	/**
	 * Constructs a new `PropertyAttributeRegistration` instance for the given parameters.
	 * @param application
	 * @param attributes
	 * @param reflection
	 */
	public constructor(application: Application, attributes: IAttributeInstance<T>[], reflection: ReflectionProperty<Component>) {
		this.target = application.container.resolve(reflection.class.target);
		this.propertyName = reflection.name;
		this.reflection = reflection;
		this.attributes = attributes;
	}

	/**
	 * Returns the first attribute instance on the property.
	 * @returns
	 */
	public first(): IAttributeInstance<T> {
		return this.attributes[this.attributes.length - 1];
	}

	/**
	 * Returns the last attribute instance on the property.
	 * @returns
	 */
	public last(): IAttributeInstance<T> {
		return this.attributes[0];
	}

	/**
	 * The current value of the property.
	 */
	public get value(): any {
		return (this.target as any)[this.propertyName];
	}

}
