export class ScheduleHandle {

	public constructor(protected readonly clearFunction: () => void) {

	}

	/**
	 * Clears the task that this handle represents.
	 */
	public clear() {
		this.clearFunction();
	}

}
