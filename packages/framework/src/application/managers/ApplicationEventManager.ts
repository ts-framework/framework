import { NestedSet } from '@baileyherbert/nested-collections';
import { Constructor, Type } from '@baileyherbert/types';
import { Controller } from '../../controllers/Controller';
import { Event } from '../../services/events/Event';
import { EventListenerHandle } from '../../services/events/EventListenerHandle';
import { EventRegistry } from '../../services/events/EventRegistry';
import { Service } from '../../services/Service';
import { isConstructor } from '../../utilities/types';
import { Application } from '../Application';

export class ApplicationEventManager {

	/**
	 * The listeners that are currently attached.
	 */
	protected listeners = new NestedSet<Type<Event<any>>, EventHandlerDescriptor>();

	/**
	 * Constructs a new `ApplicationEventManager` instance for the given root application object.
	 * @param application
	 */
	public constructor(protected application: Application) {}

	/**
	 * Emits an event of the specified type with the given data.
	 * @param event A reference to the event constructor.
	 * @param data The data to use for the event.
	 */
	public emit<T>(event: Constructor<Event<T>>, data: T): void;
	public emit<T>(event: Constructor<Event<void | undefined>>): void;

	/**
	 * Emits the given event.
	 * @param event An event instance.
	 */
	public emit<T>(event: Event<T>): void;
	public emit<T>(event: Constructor<Event<T>> | Event<any>, data?: T): void {
		if (isConstructor(event)) {
			event = new event(data);
		}

		for (const descriptor of this.listeners.values(event.constructor)) {
			descriptor.handler(event);

			// Auto remove 'once' handlers
			if (descriptor.once) {
				this.listeners.delete(event.constructor, descriptor);
			}
		}
	}

	/**
	 * Listens for an event.
	 * @param event A reference to the event constructor.
	 * @param handler A callback to handle the event.
	 * @returns An instance that can be used to manually detach the event listener.
	 */
	public on<T>(event: Type<Event<T>>, handler: EventHandler): EventListenerHandle {
		return this.attach(event, false, handler);
	}

	/**
	 * Listens for an event once and then automatically detaches.
	 * @param event A reference to the event constructor.
	 * @param handler A callback to handle the event.
	 * @returns An instance that can be used to manually detach the event listener.
	 */
	public once(event: Type<Event<any>>, handler: EventHandler): EventListenerHandle {
		return this.attach(event, true, handler);
	}

	/**
	 * Attaches an event handler.
	 * @param event A reference to the event constructor.
	 * @param once A boolean indicating if the listener should be removed after the first invocation.
	 * @param handler A callback to handle the event.
	 * @returns An instance that can be used to manually detach the event listener.
	 */
	protected attach(event: Type<Event<any>>, once: boolean, handler: EventHandler): EventListenerHandle {
		const descriptor = { handler, once };
		this.listeners.add(event, descriptor);

		return new EventListenerHandle(() => {
			this.listeners.delete(event, descriptor);
		});
	}

	/**
	 * Removes an event listener.
	 * @param event A reference to the event constructor.
	 * @param handler A callback to handle the event.
	 */
	public removeListener(event: Type<Event<any>>, handler: (event: Event<any>) => void) {
		// Find a matching descriptor
		for (const descriptor of this.listeners.values(event)) {
			if (descriptor.handler === handler) {
				this.listeners.delete(event, descriptor);
				break;
			}
		}
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

		this.listeners.clear();

		for (const target of classes) {
			const handlers = EventRegistry.getMethods(target);

			for (const [methodName, eventType] of handlers) {
				this.on(eventType, e => {
					const instance = this.application.container.resolve(target);
					const method = (instance as any)[methodName] as EventHandler;

					method.call(instance, e);
				});
			}
		}
	}

}

type EventHandler = (event: Event<any>) => any;
type EventHandlerDescriptor = {
	handler: EventHandler;
	once: boolean;
}
