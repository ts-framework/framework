import { NestedSet } from '@baileyherbert/nested-collections';
import { PromiseCompletionSource } from '@baileyherbert/promises';
import { Constructor, Type } from '@baileyherbert/types';
import { Controller } from '../../controllers/Controller';
import { Request } from '../../services/requests/Request';
import { RequestRegistry } from '../../services/requests/RequestRegistry';
import { Service } from '../../services/Service';
import { isConstructor } from '../../utilities/types';
import { Application } from '../Application';

export class ApplicationRequestManager {

	/**
	 * The listeners that are currently attached.
	 */
	protected handlers = new NestedSet<Type<Request<any, any>>, RequestHandler>();

	/**
	 * Constructs a new `ApplicationRequestManager` instance for the given root application object.
	 * @param application
	 */
	public constructor(protected application: Application) {}

	/**
	 * Emits a request of the specified type with the given data.
	 * @param request A reference to the request constructor.
	 * @param payload The request payload to send.
	 */
	public emit<T, R>(request: Constructor<Request<T, R>>, payload: T): Promise<R>;
	public emit<T, R>(request: Constructor<Request<void | undefined, R>>): Promise<R>;

	/**
	 * Emits the given request.
	 * @param request A request instance.
	 */
	public emit<T, R>(request: Request<T, R>): Promise<R>;
	public async emit<T, R>(request: Constructor<Request<T, R>> | Request<T, R>, data?: T): Promise<R> {
		if (isConstructor(request)) {
			request = new request(data);
		}

		for (const handler of this.handlers.values(request.constructor)) {
			try {
				// Set the internal functions on the request and get the new promise source
				const source = this.setRequestInternals(request);

				// Send the request to the handler
				const response = handler(request);

				// Handle promise events from the handler
				Promise.resolve(response).then(
					() => source.reject(new Error('The handler did not respond to the request')),
					error => source.reject(error)
				);

				// Wait for the promise and return its response
				return await source.promise;
			}
			catch (error) {
				if (error instanceof InternalPropagateError) {
					continue;
				}
				else {
					throw error;
				}
			}
		}

		throw new Error('No handler was available for the request');
	}

	/**
	 * Registers a request handler.
	 * @param event A reference to the request constructor that will be handled.
	 * @param handler A callback to handle the request.
	 * @returns
	 */
	public register<T, U>(event: Type<Request<T, U>>, handler: RequestHandler<T, U>) {
		this.handlers.add(event, handler);
	}

	/**
	 * Sets the given request's internal functions and returns a promise completion source which will resolve or
	 * reject when they are invoked.
	 * @param request
	 * @returns
	 */
	private setRequestInternals<T, R>(request: Request<T, R>) {
		const source = new PromiseCompletionSource<R>();

		request._internResolver = response => {
			this.clearRequestInternals(request);
			source.resolve(response);
		};

		request._internRejecter = error => {
			this.clearRequestInternals(request);
			source.reject(error);
		};

		request._internPropagator = () => {
			this.clearRequestInternals(request);
			source.reject(new InternalPropagateError());
		};

		return source;
	}

	/**
	 * Resets the given request's internal functions to an undefined state, preventing further invocations.
	 * @param request
	 */
	private clearRequestInternals<T, R>(request: Request<T, R>) {
		request._internResolver = undefined;
		request._internRejecter = undefined;
		request._internPropagator = undefined;
	}

	/**
	 * Attaches event listeners from the global registry.
	 *
	 * @internal
	 */
	public async init() {
		const classes = new Array<Constructor<Service | Controller>>();

		classes.push(...this.application.services.getAll());
		classes.push(...this.application.controllers.getAll());

		this.handlers.clear();

		for (const target of classes) {
			const handlers = RequestRegistry.getMethods(target);

			for (const [methodName, eventType] of handlers) {
				this.register(eventType, e => {
					const instance = this.application.container.resolve(target);
					const method = (instance as any)[methodName] as RequestHandler;

					return method.call(instance, e);
				});
			}
		}
	}

}

type RequestHandler<T = any, U = any> = (event: Request<T, U>) => any;

class InternalPropagateError extends Error {}
