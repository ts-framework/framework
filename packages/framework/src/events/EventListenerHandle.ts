/**
 * A handle that represents an event listener attachment.
 */
export class EventListenerHandle {

	/**
	 * @internal
	 */
	public constructor(private onDetach: () => void) {

	}

	/**
	 * Detaches the event listener from the event.
	 */
	public detach() {
		this.onDetach();
	}

}
