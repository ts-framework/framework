import { Type } from '@baileyherbert/types';
import { Event } from './Event';

class EventRegistryImpl {

	protected hooks = new Map<Type<any>, EventListenerMap>();

	/**
	 * Registers a class method as an event handler.
	 * @param target The class where the method exists.
	 * @param methodName The method name.
	 * @param event The target event class to listen for.
	 */
	public register(target: Type<any>, methodName: string, event: Type<Event<any>>) {
		if (!this.hooks.has(target)) {
			this.hooks.set(target, new Map());
		}

		const registry = this.hooks.get(target)!;
		registry.set(methodName, event);
	}

	/**
	 * Returns a map containing all registered event listeners on the given target class.
	 * @param target
	 * @returns
	 */
	public getMethods(target: Type<any>): EventListenerMap {
		return this.hooks.get(target) ?? new Map();
	}

}

/**
 * The global event registry.
 */
export const EventRegistry = new EventRegistryImpl();

type EventListenerMap = Map<string, Type<Event<any>>>;
