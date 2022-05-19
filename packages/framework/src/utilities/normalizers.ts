import { LogLevel } from '@baileyherbert/logging';

/**
 * Converts the input into a guaranteed log level.
 *
 * @param input The untrusted developer input.
 * @param def The default log level when the input is `undefined` or `true`.
 * @returns
 */
export function normalizeLogLevel<T extends LogLevel | undefined>(input: LogLevel | boolean | undefined, def?: T) {
	if (input === undefined || input === true) {
		return def;
	}

	if (input === false) {
		return LogLevel.None;
	}

	return input;
}
