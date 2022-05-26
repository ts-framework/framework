const extractPathRegex = /\s+at.*[(\s](.*)\)?/;
const pathRegex = /^(?:(?:(?:node|node:[\w/]+|(?:(?:node:)?internal\/[\w/]*|.*node_modules\/(?:babel-polyfill|pirates)\/.*)?\w+)(?:\.js)?:\d+:\d+)|native)/;

export class ErrorEvent {

	/**
	 * The outermost error for the event.
	 */
	public error: Error;

	/**
	 * The additional errors in the chain. The original error will be the first element in the array, and the outermost
	 * error will be the last.
	 */
	public chain: Error[];

	/**
	 * A boolean indicating whether this event should propagate further.
	 */
	private _propagate = true;

	/**
	 * A boolean indicating whether this event should be logged.
	 */
	private _output = true;

	/**
	 * Constructs a new `ErrorEvent` instance with the given error chain.
	 * @param sender The approximate object from where the error event originated.
	 * @param chain The error chain with the original error first.
	 */
	public constructor(public readonly sender: object, chain: Error[]) {
		this.error = chain[chain.length - 1];
		this.chain = chain;
	}

	/**
	 * Prevents the error from propagating further up the error management stack.
	 */
	public stopPropagation() {
		this._propagate = false;
	}

	/**
	 * Prevents the error from being logged to output, but allows it to continue propagating up the error management
	 * stack. Note that it's up to other handlers to respect this behavior.
	 */
	public stopOutput() {
		this._output = false;
	}

	/**
	 * Transforms the error into the given error object, and pushes the previous error onto the error chain.
	 * @param error
	 */
	public transform(error: Error) {
		this.chain.push(error);
		this.error = error;
	}

	/**
	 * Returns true if the given event can be logged to output.
	 * @param event
	 * @returns
	 */
	public static canOutput(event: ErrorEvent) {
		return event._output;
	}

	/**
	 * Returns true if the given event can propagate further.
	 * @param event
	 * @returns
	 */
	public static canPropagate(event: ErrorEvent) {
		return event._propagate;
	}

	/**
	 * Converts the error chain to a string.
	 * @returns
	 */
	public toString() {
		const name = this.getErrorName(this.error);
		const message = this.getErrorMessage();
		const lines = new Array<string>();

		lines.push(`${name}: ${message}`);

		this.chain.forEach((error, index) => {
			// The original stack will be added in full (minus cleaning)
			if (index === 0) {
				lines.push(...this.getCleanStack(error.stack));
			}

			// Chained stacks will have their first path-lines added
			// These lines denote where the chain was amended or transformed
			else {
				const line = this.getCleanStack(error.stack)[0] ?? '<unknown>';

				if (typeof line === 'string') {
					const trace = line.replace(/^\s+ at /, '');
					const previousErrorName = this.getErrorName(this.chain[index - 1]);

					lines.push(`    from ${previousErrorName} at ${trace}`);
				}
			}
		});

		return lines.join('\n');
	}

	/**
	 * Returns the combination of all error messages in the chain.
	 * @returns
	 */
	private getErrorMessage() {
		return this.chain.map(error => error.message).map((message, index) => {
			if (index > 0) {
				return message.trim().replace(/[\s.,?;:!-]+$/m, '');
			}

			return message;
		}).reverse().join(': ');
	}

	/**
	 * Returns the name of the error object.
	 * @returns
	 */
	private getErrorName(error: Error) {
		return error.constructor.name;
	}

	/**
	 * Returns a cleaned version of the given stack.
	 * @param stack
	 * @returns
	 */
	private getCleanStack(stack?: string) {
		if (typeof stack !== 'string') {
			return '<unknown>';
		}

		return (stack.replace(/\\/g, '/')
			.split('\n')
			.filter(line => {
				const pathMatches = line.match(extractPathRegex);

				if (pathMatches === null || !pathMatches[1]) {
					return false;
				}

				return !pathRegex.test(pathMatches[1]) && !/<anonymous>/.test(pathMatches[1]);
			})
			.filter(line => line.trim() !== '')
		);
	}

}

