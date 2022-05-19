/**
 * This error is used to denote an action as unimplemented.
 */
export class NotImplementedError extends Error {

	public constructor(message?: string) {
		super(message ?? 'Not implemented');
	}

}
