import { NestedSet } from '@baileyherbert/nested-collections';
import { ErrorEvent } from './ErrorEvent';
import { AbortError } from './lifecycles/AbortError';

export class ErrorManager {

	private _onListeners = new NestedSet<string, Callback>();
	private _onceListeners = new NestedSet<string, Callback>();

	private _attachedPromises = new Set<Promise<any>>();
	private _attachedEmitters = new Map<Emitter, Callback>();

	/**
	 * The sender for this manager.
	 */
	private sender: object;

	/**
	 * The parent managers who will receive errors emitted on this manager.
	 * @internal
	 */
	public _targetManagers = new Set<ErrorManager>();

	/**
	 * Constructs a new `ErrorManager` instance for the given sender.
	 * @param sender
	 */
	public constructor(sender: object) {
		this.sender = sender;
	}

	/**
	 * Emits a passive error into the application. The error may be logged and reported, but will not be considered a
	 * serious fault and the application can continue.
	 * @param error
	 * @param innerError
	 */
	public emitPassiveError(error: any, innerError?: any) {
		this._propagateEvent(this.createEvent(error, innerError), false);
	}

	/**
	 * Emits a critical error into the application. The error may be logged and reported, and will be considered a
	 * serious fault that causes the application to shut down.
	 * @param error
	 * @param innerError
	 */
	public emitCriticalError(error: any, innerError?: any) {
		this._propagateEvent(this.createEvent(error, innerError), true);
	}

	/**
	 * Emits a critical error into the application and then throws an `AbortError`.
	 * @param error
	 * @param innerError
	 * @internal
	 */
	public abort(error: any, innerError?: any): never {
		this._propagateEvent(this.createEvent(error, innerError), true);
		throw new AbortError();
	}

	/**
	 * Attaches a promise to the error manager, listening for rejections and emitting them, until the promise is
	 * finished.
	 *
	 * @param promise
	 *   The promise from which to watch for rejections.
	 * @param critical
	 *   A boolean indicating whether rejections from this promise should be considered critical (defaults to `false`).
	 * @returns
	 *   A new promise that resolves to the same value. The returned promise will never reject, and instead will
	 *   resolve to `undefined` upon rejection.
	 */
	public attach<T>(promise: Promise<T>, critical?: boolean): Promise<T | undefined>;

	/**
	 * Attaches an event emitter to the error manager, listening for the `error` event and emitting their errors.
	 * Please note that the event listener will remain permanently unless you use the `detach()` method on the same
	 * object at some point.
	 *
	 * @param emitter
	 *   The event emitter from which to listen for `error` events.
	 * @param critical
	 *   A boolean indicating whether errors from this emitter should be considered critical (defaults to `false`).
	 * @returns
	 *   The same event emitter object that was given.
	 */
	public attach<T extends Emitter>(emitter: T, critical?: boolean): T;

	/**
	 * Attaches another event manager to this manager, thus propagating errors from the given manager into this
	 * manager.
	 * @param manager The manager to receive errors from.
	 */
	public attach(manager: ErrorManager): void;
	public attach(target: ErrorManager | Emitter | Promise<any>, critical = false) {
		if (target instanceof ErrorManager) {
			target._targetManagers.add(this);
			return;
		}
		else if (typeof target === 'object' && 'then' in target && typeof target.then === 'function') {
			return this.attachPromise(target, critical);
		}
		else if (typeof target === 'object' && 'on' in target && typeof target.on === 'function') {
			return this.attachEmitter(target, critical);
		}

		throw new Error('Cannot attach because the target is an unfamiliar type');
	}

	/**
	 * Attaches to the given promise.
	 * @param target
	 * @param critical
	 * @returns
	 */
	private attachPromise(target: Promise<any>, critical: boolean) {
		return target.then(value => {
			this._attachedPromises.delete(target);
			return Promise.resolve(value);
		}, error => {
			if (this._attachedPromises.delete(target)) {
				this._propagateEvent(this.createEvent(error), critical);
			}

			return Promise.resolve(undefined);
		});
	}

	/**
	 * Attaches to the given emitter.
	 * @param target
	 * @param critical
	 * @returns
	 */
	private attachEmitter(target: Emitter, critical: boolean) {
		if (!this._attachedEmitters.has(target)) {
			const handler = (error: any) => {
				this._propagateEvent(this.createEvent(error), critical);
			};

			target.on('error', handler);
			this._attachedEmitters.set(target, handler);
		}

		return target;
	}

	/**
	 * Detaches the given emitter from the manager. It will no longer be watched for `error` events.
	 * @param emitter
	 */
	public detach(emitter: Emitter): void;

	/**
	 * Detaches the given promise from the manager. It will no longer be watched for rejections.
	 * @param promise
	 */
	public detach(promise: Promise<any>): void;

	/**
	 * Detaches the given manager from this manager. Errors will no longer be received from it.
	 * @param manager
	 */
	public detach(manager: ErrorManager): void;
	public detach(target: Emitter | Promise<any> | ErrorManager) {
		if (target instanceof ErrorManager) {
			target._targetManagers.delete(this);
		}
		else if (typeof target === 'object' && 'then' in target && typeof target.then === 'function') {
			this._attachedPromises.delete(target);
		}
		else if (typeof target === 'object' && 'on' in target && typeof target.on === 'function') {
			if (this._attachedEmitters.has(target)) {
				const handler = this._attachedEmitters.get(target)!;
				target.removeListener('error', handler);
				this._attachedEmitters.delete(target);
			}
		}

		throw new Error('Cannot detach because the target is an unfamiliar type');
	}

	/**
	 * Handles passive errors as they propagate through this manager.
	 * @param event
	 * @param callback
	 */
	public on(event: 'passive', callback: Callback): this;

	/**
	 * Handles critical errors as they propagate through this manager.
	 * @param event
	 * @param callback
	 */
	public on(event: 'critical', callback: Callback): this;
	public on(event: string, callback: Callback): this {
		this._onListeners.add(event, callback);
		return this;
	}

	/**
	 * Handles passive errors as they propagate through this manager.
	 * @param event
	 * @param callback
	 */
	public once(event: 'passive', callback: Callback): this;

	/**
	 * Handles critical errors as they propagate through this manager.
	 * @param event
	 * @param callback
	 */
	public once(event: 'critical', callback: Callback): this;
	public once(event: string, callback: Callback): this {
		this._onListeners.add(event, callback);
		this._onceListeners.add(event, callback);
		return this;
	}

	/**
	 * Removes the listener for an event.
	 * @param event
	 * @param callback
	 */
	public removeListener(event: 'passive' | 'critical', callback: Callback) {
		this._onListeners.delete(event, callback);
		this._onceListeners.delete(event, callback);
	}

	/**
	 * Propagates the given event through this manager's listeners and then sends it to parents.
	 * @param event
	 * @param critical
	 * @internal
	 */
	public _propagateEvent(event: ErrorEvent, critical: boolean) {
		const eventName = critical ? 'critical' : 'passive';

		for (const listener of this._onListeners.values(eventName)) {
			listener.call(this, event);

			// Delete once events
			if (this._onceListeners.delete(eventName, listener)) {
				this._onListeners.delete(eventName, listener);
			}
		}

		// Propagate to target managers
		for (const target of this._targetManagers) {
			if (ErrorEvent.canPropagate(event)) {
				target._propagateEvent(event, critical);
			}
			else {
				return;
			}
		}
	}

	/**
	 * Creates an event from the given errors.
	 * @param error An error object or string to use as the error.
	 * @param innerError An error object, string, array of errors, or `ErrorEvent` to use as the error chain.
	 * @returns
	 */
	public createEvent(error: any, innerError?: any): ErrorEvent {
		const outerError = this.createError(error);
		const chain = this.createErrorChain(outerError, innerError);

		return new ErrorEvent(this.sender, chain);
	}

	/**
	 * Forces the given input into an `Error` object.
	 * @param input
	 * @returns
	 */
	private createError(input: any): Error {
		if (input instanceof Error) {
			return input;
		}

		if (typeof input === 'string') {
			return new Error(input);
		}

		return new Error(`Unknown error of type ${typeof input}`);
	}

	/**
	 * Creates an error chain from the given inputs, with the original error as the first element, and the outermost
	 * error as the last.
	 * @param outerError
	 * @param input
	 */
	private createErrorChain(outerError: Error, input?: any): Error[] {
		if (typeof input === 'undefined') {
			return [outerError];
		}

		if (Array.isArray(input)) {
			return [...input, outerError];
		}

		if (input instanceof ErrorEvent) {
			return [...input.chain, outerError];
		}

		return [this.createError(input), outerError];
	}

	/**
	 * Returns a new child error manager instance that propagates up to this manager.
	 * @param sender
	 * @returns
	 */
	public createManager(sender: object) {
		const manager = new ErrorManager(sender);
		manager._targetManagers.add(this);

		return manager;
	}

}

interface Emitter {
	on(event: any, callback: (...args: any[]) => any): any;
	removeListener(event: any, callback: (...args: any[]) => any): any;
}

type Callback = (event: ErrorEvent) => void;
