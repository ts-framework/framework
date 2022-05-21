/**
 * The base class for all requests.
 */
export abstract class Request<RequestType, ResponseType> {

	/**
	 * The timestamp in milliseconds for when this request was created.
	 */
	public readonly timestamp: number;

	/**
	 * The request payload.
	 */
	public readonly payload: RequestType;

	/**
	 * The object that generated this event or `undefined` if it originated from outside the application.
	 */
	public readonly sender?: any;

	/**
	 * The function to use for resolving the request.
	 * @internal
	 */
	public _internResolver?: (response: ResponseType) => void;

	/**
	 * The function to use for rejecting the request.
	 * @internal
	 */
	public _internRejecter?: (error: Error) => void;

	/**
	 * The function to use for propagating the request.
	 * @internal
	 */
	public _internPropagator?: () => void;

	/**
	 * Constructs a new `Request` instance with the given request payload.
	 * @param payload
	 */
	public constructor(payload: RequestType, sender: any) {
		this.payload = payload;
		this.sender = sender;
		this.timestamp = Date.now();
	}

	/**
	 * Resolves the request with the given response.
	 */
	public resolve(response: ResponseType) {
		if (!this._internResolver) {
			throw new Error('The request is not currently in a state that allows resolving');
		}

		this._internResolver(response);
	}

	/**
	 * Rejects the request with an error.
	 * @param error
	 */
	public reject(error: Error) {
		if (!this._internRejecter) {
			throw new Error('The request is not currently in a state that allows rejecting');
		}

		this._internRejecter(error);
	}

	/**
	 * Propagates the request to the next available handler.
	 */
	public propagate() {
		if (!this._internPropagator) {
			throw new Error('The request is not currently in a state that allows propagating');
		}

		this._internPropagator();
	}

}
