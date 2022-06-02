/**
 * For errors that originate from the framework internals. Please report these!
 */
export class FrameworkError extends Error {

	public static from(error: Error): FrameworkError {
		const fwError = new FrameworkError(error.message);
		fwError.stack = error.stack;
		return fwError;
	}

}
