import { FrameworkExtension } from '../../extensions/FrameworkExtension';
import { Service } from '../Service';

export class StateManager {

	/**
	 * A map of local state symbols to their property names on the class (or `undefined` if unknown).
	 */
	private properties = new Map<symbol, string | undefined>();

	/**
	 * A map of local state symbols and their initial values.
	 */
	private initials = new Map<symbol, any>();

	/**
	 * A boolean indicating whether the state has been initialized.
	 */
	private initialized = false;

	/**
	 * The extensions that have been loaded into this manager.
	 * @internal
	 */
	public _internExtensions: FrameworkExtension[];

	public constructor(protected service: Service) {
		this._internExtensions = service.application.extensions.augment(this);
	}

	/**
	 * Creates a new managed state property of the given type with an initial value of `undefined`.
	 */
	public create<T>(): T | undefined;

	/**
	 * Creates a new managed state property of the given type and initial value.
	 * @param initial
	 */
	public create<T>(initial: T): T;
	public create<T>(initial?: T): any {
		const symbol = Symbol();

		if (this.initialized) {
			throw new Error('Cannot create managed state properties after the service has been constructed');
		}

		this.properties.set(symbol, undefined);
		this.initials.set(symbol, initial);

		return symbol;
	}

	/**
	 * Resets all state in the service back to their initial values.
	 */
	public clear() {
		for (const [symbol, propName] of this.properties) {
			if (typeof propName === 'undefined') {
				throw new Error(`Failed to locate managed state property "${propName}"`);
			}

			(this.service as any)[propName] = this.clone(this.initials.get(symbol));
		}
	}

	/**
	 * Initializes the service and its state. Returns an array of properties in the service that are in
	 * @internal
	 */
	public _initialize(): string[] {
		const descriptors = Object.getOwnPropertyDescriptors(this.service);
		const names = new Array<string>();

		for (const propName in descriptors) {
			const descriptor = descriptors[propName];

			if (this.properties.has(descriptor.value)) {
				this.properties.set(descriptor.value, propName);
				names.push(propName);
			}
		}

		this.clear();
		this.initialized = true;

		return names;
	}

	/**
	 * Clones the given value.
	 * @param initial
	 * @returns
	 */
	private clone(initial?: any): any {
		const primitives = ['string', 'number', 'boolean', 'bigint', 'symbol', 'undefined'];

		if (primitives.includes(typeof initial)) {
			return initial;
		}

		if (Array.isArray(initial)) {
			return [...initial.map(item => this.clone(item))];
		}

		if (initial instanceof Map) {
			const arr: any[] = [...initial.entries()].map(([key, value]) => [key, this.clone(value)]);
			return new Map(arr);
		}

		if (initial instanceof Set) {
			const arr: any[] = [...initial.values()].map(value => this.clone(value));
			return new Set(arr);
		}

		if (typeof initial === 'function') {
			return initial.bind(this.service);
		}

		if (typeof initial === 'object') {
			const clone: Record<any, any> = {};

			for (const name in initial) {
				clone[name] = this.clone(initial[name]);
			}

			return clone;
		}

		throw new Error(`Not sure how to clone this value (typeof ${typeof initial})`);
	}

}
