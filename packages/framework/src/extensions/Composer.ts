import { EventEmitter } from '@baileyherbert/events';
import { ReflectionClass } from '@baileyherbert/reflection'
import { Key } from '@baileyherbert/types';
import { Application } from '../application/Application';
import { Module } from '../modules/Module';
import { Component } from '../services/attributes/Attribute';

export class Composer<T extends object> extends EventEmitter<ComposerEvents> {

	/**
	 * Reflection instance for the target class.
	 */
	public reflection: ReflectionClass<T>;

	/**
	 * The target instance.
	 */
	public instance: T;

	/**
	 * Whether the properties set by this composer will be writable.
	 * @default true
	 */
	public writable = true;

	/**
	 * Whether the properties set by this composer will be configurable.
	 * @default false
	 */
	public configurable = false;

	/**
	 * Whether the properties set by this composer will be enumerable.
	 * @default true
	 */
	public enumerable = true;

	/**
	 * The properties to set on the instance.
	 */
	protected properties = new Map<string | symbol, PropertyDescriptor>();

	/**
	 * The methods to set on the instance.
	 */
	protected methods = new Map<string | symbol, (...args: any[]) => any>();

	/**
	 * Constructs a new `Composer<T>` instance.
	 * @param instance
	 * @param reflection
	 * @internal
	 */
	public constructor(instance: T, reflection: ReflectionClass<T>) {
		super();

		this.instance = instance;
		this.reflection = reflection;
	}

	/**
	 * Adds a getter to the instance.
	 * @param name
	 * @param implementation
	 */
	public createGetter(name: string | symbol, implementation: ComposerGetter) {
		this.get(name).get = implementation;
	}

	/**
	 * Adds a setter to the instance.
	 * @param name
	 * @param implementation
	 */
	public createSetter(name: string | symbol, implementation: ComposerSetter) {
		this.get(name).set = implementation;
	}

	/**
	 * Adds a property to the instance with the given value.
	 * @param name
	 * @param value
	 */
	public createProperty(name: string | symbol, value: any) {
		this.get(name).value = value;
	}

	/**
	 * Adds a method to the instance that calls the given function.
	 * @param name
	 * @param implementation
	 */
	public createMethod(name: string | symbol, implementation: ComposerMethod) {
		this.methods.set(name, implementation);
	}

	/**
	 * Applies the composer's properties and methods to the instance.
	 * @internal
	 */
	public _internApply() {
		for (const [name, descriptor] of this.properties) {
			const properties = typeof descriptor.set === 'undefined' && typeof descriptor.get === 'undefined' ? {
				writable: this.writable
			} : {};

			if (name in this.instance) {
				throw new Error(`Attempt to overwrite property method "${String(name)}" on ${this.reflection.name}`);
			}

			Object.defineProperty(this.instance, name, {
				...descriptor,
				...properties
			});
		}

		for (const [name, implementation] of this.methods) {
			if (name in this.instance) {
				throw new Error(`Attempt to overwrite existing method "${String(name)}" on ${this.reflection.name}`);
			}

			(this.instance as any)[name] = implementation;
		}
	}

	/**
	 * Internal emit method.
	 * @param event
	 * @param args
	 * @returns
	 * @internal
	 */
    public override emit<E extends Key<ComposerEvents>>(event: E, ...args: ComposerEvents[E]) {
		return super.emit(event, ...args);
	}

	/**
	 * Returns the internal property descriptor for the given name, creating it if necessary. The returned object can
	 * be directly modified.
	 * @param name
	 * @returns
	 */
	protected get(name: string | symbol) {
		if (!this.properties.has(name)) {
			this.properties.set(name, {
				configurable: this.configurable,
				enumerable: this.enumerable
			});
		}

		return this.properties.get(name)!;
	}

}

export type ComposerTarget = object;
export type ComposerGetter = () => any;
export type ComposerSetter = (value: any) => any;
export type ComposerMethod = (...args: any[]) => any;

export type ComposerEvents = {
	afterResolution: [];
	beforeStart: [];
	afterStart: [];
	beforeStop: [];
	afterStop: [];
};
