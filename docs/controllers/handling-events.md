# Handling events

## Handling with decorations

You can turn controller methods into event handlers with the `#!ts @EventHandler` decorator. For this to work, you'll
also need to specify the event class as its sole parameter.

```ts
@EventHandler
protected onExampleStarted(event: ExampleEvent.Started) {
	this.logger.info('Started at:', event.data);
}
```

The framework will attach these methods to the root event manager at startup. It will use runtime reflection to
identify the target event type from the parameters.

## Handling manually

You can utilize the application's root event manager to manually listen for events.

```ts
app.events.on(ExampleEvent.Started, event => {
	console.log('Started at:', event.data);
});
```

Unlike handlers from decorations, which are detached when the application stops, these event handlers are permanent
unless removed with the `removeListener()` method or using the returned handle's `detach()` method.

## Error handling

When an error is thrown from an event handler, the error will be caught by the framework and emitted on the
controller's error manager as a passive error. This means you don't need to do any special error handling within your
callbacks.

```ts
@EventHandler
protected onExampleStarted(event: ExampleEvent.Started) {
	throw new Error('I will be caught and logged');
}
```
