import { Event } from './Event';

/**
 * Utility type that extracts the type of data stored in the given event class.
 */
export type EventData<E extends Event<any>> = E extends { data: infer T } ? T : void;
