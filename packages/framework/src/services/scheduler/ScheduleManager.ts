import { PromiseCompletionSource } from '@baileyherbert/promises';
import { FrameworkExtension } from '../../extensions/FrameworkExtension';
import { Service } from '../Service';
import { ScheduleError } from './ScheduleError';
import { ScheduleHandle } from './ScheduleHandle';

export class ScheduleManager {

	private handles = new Set<ScheduleHandle>();
	private outstanding = new Set<Promise<any>>();

	/**
	 * The extensions that have been loaded into this manager.
	 * @internal
	 */
	public _internExtensions: FrameworkExtension[];

	public constructor(private readonly service: Service) {
		this._internExtensions = service.application.extensions.augment(this);
	}

	/**
	 * Creates and starts a timeout that will be cleared automatically when the service stops.
	 * @param callback The function or callback to execute.
	 * @param millis The number of milliseconds to wait.
	 * @returns
	 */
	public createTimeout(callback: Callback, millis: number): ScheduleHandle {
		let handle: ScheduleHandle;

		const id = setTimeout(async () => {
			let response: any;

			try {
				this.handles.delete(handle);
				response = callback.call(this.service);

				if (typeof response === 'object' && response.then && typeof response.finally === 'function') {
					this.outstanding.add(response);
					await response;
				}
			}
			catch (error) {
				this.service.errors.emitPassiveError(new ScheduleError('Error in timeout'), error);
			}
			finally {
				if (response) {
					this.outstanding.delete(response);
				}
			}
		}, millis);

		handle = new ScheduleHandle(() => {
			if (this.handles.delete(handle)) {
				clearTimeout(id);
			}
		});

		this.handles.add(handle);
		return handle;
	}

	/**
	 * Creates and starts an interval which will be cleared automatically when the service stops.
	 * @param callback The function or callback to execute.
	 * @param millis The number of milliseconds to use for the interval.
	 * @returns
	 */
	public createInterval(callback: Callback, millis: number): ScheduleHandle {
		let handle: ScheduleHandle;

		const id = setInterval(async () => {
			let response: any;

			try {
				response = callback.call(this.service);

				if (typeof response === 'object' && response.then && typeof response.finally === 'function') {
					this.outstanding.add(response);
					await response;
				}
			}
			catch (error) {
				this.service.errors.emitPassiveError(new ScheduleError('Error in interval'), error);
			}
			finally {
				if (response) {
					this.outstanding.delete(response);
				}
			}
		}, millis);

		handle = new ScheduleHandle(() => {
			if (this.handles.delete(handle)) {
				clearInterval(id);
			}
		});

		this.handles.add(handle);
		return handle;
	}

	/**
	 * Clears all active tasks. This is called automatically immediately before the service stops. Returns a promise
	 * that resolves once all pending tasks are finished.
	 * @param timeout Maximum duration to wait (defaults to `60000` millis).
	 */
	public async clearAll(timeout = 60000) {
		for (const handle of this.handles) {
			handle.clear();
		}

		if (this.outstanding.size > 0) {
			this.service.logger.info(
				'Waiting for %d active task%s to finish before stopping',
				this.outstanding.size,
				this.outstanding.size === 1 ? '' : 's'
			);

			let timeoutToken: NodeJS.Timeout | undefined;

			const source = new PromiseCompletionSource<boolean>();

			Promise.allSettled([...this.outstanding]).then(() => {
				source.resolve(true);
				clearTimeout(timeoutToken);
			});

			if (timeout > 0) {
				timeoutToken = setTimeout(() => {
					source.resolve(false);
				}, timeout);
			}

			if (!await source.promise) {
				this.service.logger.warning(
					'Timed out: There %s still %d task%s outstanding',
					this.outstanding.size === 1 ? 'was' : 'were',
					this.outstanding.size,
					this.outstanding.size === 1 ? '' : 's'
				);
			}

			clearTimeout(timeoutToken);
		}

	}

}

type Callback = () => any;
