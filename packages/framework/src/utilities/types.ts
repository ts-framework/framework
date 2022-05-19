import { Constructor } from '@baileyherbert/types';

/**
 * Returns true if the given value is a class constructor.
 *
 * @param value
 * @returns
 */
export function isConstructor(value: unknown): value is Constructor<any> {
	return (
		typeof value === 'function' &&
		value.hasOwnProperty('prototype') &&
		typeof value.prototype.constructor === 'function'
	);
}
