import { ErrorEvent } from '../ErrorEvent';

/**
 * Aborts an operation with a corresponding `ErrorEvent`.
 */
export class AbortError extends Error {
	public constructor(public readonly event?: ErrorEvent) {
		super();
	}
}
