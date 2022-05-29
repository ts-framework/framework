# Adding events

In this framework, controllers can listen for events which are invoked globally by services. Unlike traditional events,
which use string keys that can collide, these events use classes which also define the types of data and implement
strict typing.

## Creating events

The standard convention for this framework is to create namespaces with event classes inside, thus creating a structure
similar to an enum.

```ts
export namespace ExampleEvent {

	/**
	 * Invoked when the example service starts, along with a timestamp
	 * for when that happened.
	 */
	export class Started extends Event<number> {}

	/**
	 * Invoked when the example service stops, with no associated data.
	 */
	export class Stopped extends Event {}

}
```

## Sending events

You can then send events from within your service using the protected `emit()` method.

```ts
protected override async start() {
	this.emit(ExampleEvent.Started, Date.now());
}

protected override async stop() {
	this.emit(ExampleEvent.Stopped);
}
```

You can also emit events on the application directly, however this is not recommended as the `sender` property of the
event will not be accurate.

```ts
app.events.emit(ExampleEvent.Started, Date.now());
```

## Handling events

You can listen for events from both services and controllers by using the `#!ts @EventHandler` decorator along with the
event class as the parameter type.

```ts
@EventHandler
protected onExampleStarted(event: ExampleEvent.Started) {
	this.logger.info('Started at:', event.data);
}
```

Please note that events are global in this framework and these handlers will work regardless of where they are
implemented.
