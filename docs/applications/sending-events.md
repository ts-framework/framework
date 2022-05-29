# Sending events

## Emitting events

You can send events into an application for controllers to handle. This allows you to trigger events from outside the
application, such as from user input in another part of the application.

```ts
app.events.emit(Event);
app.events.emit(Event, ...args);
```

## Handling events

Check out the documentation on [service events](../services/adding-events.md) to get started.
