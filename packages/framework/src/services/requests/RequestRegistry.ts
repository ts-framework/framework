import { Type } from '@baileyherbert/types';
import { Request } from './Request';

class RequestRegistryImpl {

	protected hooks = new Map<Type<any>, RequestListenerMap>();

	/**
	 * Registers a class method as a request handler.
	 * @param target The class where the method exists.
	 * @param methodName The method name.
	 * @param request The target request class to listen for.
	 */
	public register(target: Type<any>, methodName: string, request: Type<Request<any, any>>) {
		if (!this.hooks.has(target)) {
			this.hooks.set(target, new Map());
		}

		const registry = this.hooks.get(target)!;
		registry.set(methodName, request);
	}

	/**
	 * Returns a map containing all registered request listeners on the given target class.
	 * @param target
	 * @returns
	 */
	public getMethods(target: Type<any>): RequestListenerMap {
		return this.hooks.get(target) ?? new Map();
	}

}

/**
 * The global request registry.
 */
export const RequestRegistry = new RequestRegistryImpl();

type RequestListenerMap = Map<string, Type<Request<any, any>>>;
