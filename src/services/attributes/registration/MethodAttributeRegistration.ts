import { TiedContainerDispatcher } from '@baileyherbert/container';
import { IAttribute, IAttributeInstance, ReflectionMethod } from '@baileyherbert/reflection';
import { Application } from '../../../application/Application';
import { Component } from '../Attribute';
import { AttributeRegistration } from './AttributeRegistration';

export class MethodAttributeRegistration<T extends IAttribute<any>> implements AttributeRegistration<T> {

	/**
	 * The instances of the controller or service where this method is defined.
	 */
	public targets: Component[];

	/**
	 * The name of the method.
	 */
	public methodName: string;

	/**
	 * A reflection instance for the target method.
	 */
	public reflection: ReflectionMethod<Component>;

	/**
	 * An array of all attribute instances that were applied to the method.
	 */
	public attributes: IAttributeInstance<T>[];

	/**
	 * An array of dispatchers that can be used to execute the methods with dependency injection.
	 */
	public dispatchers: TiedContainerDispatcher[];

	/**
	 * Constructs a new `MethodAttributeRegistration` instance for the given parameters.
	 * @param application
	 * @param targets
	 * @param attributes
	 * @param reflection
	 */
	public constructor(
		application: Application,
		targets: Component[],
		attributes: IAttributeInstance<T>[],
		reflection: ReflectionMethod<Component>
	) {
		this.targets = targets;
		this.methodName = reflection.name;
		this.reflection = reflection;
		this.attributes = attributes;
		this.dispatchers = targets.map(o => application.container.createTiedDispatcher(o, this.methodName));
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
