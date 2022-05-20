/**
 * The base class for all events.
 */
export abstract class Event<T = void> {

	/**
	 * The timestamp in milliseconds for when this event was created.
	 */
	public readonly timestamp: number;

	/**
	 * The data in this event.
	 */
	public readonly data: T;

	/**
	 * The object that generated this event or `undefined` if it originated from outside the application.
	 */
	public readonly sender?: any;

	/**
	 * Constructs a new `Event` instance with the given data.
	 * @param data
	 */
	public constructor(data: T, sender: any) {
		this.data = data;
		this.sender = sender;
		this.timestamp = Date.now();
	}

}
