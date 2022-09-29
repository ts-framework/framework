export class ServiceOperationError extends Error {
	public constructor(operation: 'start' | 'stop' | 'register') {
		const verb = operation === 'stop' ? 'stopping' : (operation + 'ing');
		super(`Error when ${verb} service`);
	}
}
