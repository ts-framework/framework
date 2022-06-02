import { PromiseCompletionSource } from '@baileyherbert/promises';
import { FrameworkExtension } from '../../extensions/FrameworkExtension';
import { Service } from '../Service';

export class PromiseManager {

	/**
	 * The promises being tracked.
	 */
	private promises = new Set<Promise<any>>();

	/**
	 * The completion sources and their corresponding timeouts.
	 */
	private completionSources = new Map<PromiseCompletionSource<boolean>, NodeJS.Timeout | undefined>();

	/**
	 * The extensions that have been loaded into this manager.
	 * @internal
	 */
	public _internExtensions: FrameworkExtension[];

	public constructor(private readonly service: Service) {
		this._internExtensions = service.application.extensions.augment(this);
	}

	/**
	 * The number of outstanding promises in the manager.
	 */
	public get size() {
		return this.promises.size;
	}

	/**
	 * Tracks the given promise in the manager and returns the same exact object.
	 * @param promise
	 * @returns
	 */
	public track<T>(promise: Promise<T>): Promise<T> {
		this.promises.add(promise);
		promise.finally(() => this.clearPromise(promise));
		return promise;
	}

	/**
	 * Waits for all promises in the manager to finish.
	 * @param duration Maximum time to wait (defaults to `60000` millis).
	 */
	public waitAll(duration = 60000): Promise<boolean> {
		const source = new PromiseCompletionSource<boolean>();
		const timeout = duration >= 0 ? setTimeout(() => this.timeout(source), duration) : undefined;
		this.completionSources.set(source, timeout);

		return source.promise;
	}

	/**
	 * Handles timeout of the given source.
	 * @param source
	 */
	private timeout(source: PromiseCompletionSource<boolean>) {
		source.resolve(false);
		this.completionSources.delete(source);
	}

	/**
	 * Cleans up the given promise.
	 * @param promise
	 */
	private clearPromise(promise: Promise<any>) {
		if (this.promises.delete(promise)) {
			if (this.promises.size === 0) {
				for (const [source, timeout] of this.completionSources) {
					source.resolve(true);
					clearTimeout(timeout);
					this.completionSources.delete(source);
				}
			}
		}
	}

	/**
	 * Clears the manager of all internal state.
	 * @internal
	 */
	public _clearAll() {
		this.promises.clear();

		for (const [source, timeout] of this.completionSources) {
			source.resolve(true);
			clearTimeout(timeout);
		}

		this.completionSources.clear();
	}

}
