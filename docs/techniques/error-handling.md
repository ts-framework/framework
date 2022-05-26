# Error handling

## Introduction

Due to the extensible nature of this framework, it includes tools that make it easier to both throw and handle errors
across the application, as well as within individual modules and services.

### Error managers

All major components in the framework – from the application itself to the individual modules, services, and
controllers which power them – expose a public `errors` property that has a dedicated **error manager** assigned
specifically to that instance.

These managers are standing by to accept any errors that your code needs to report. When an error is reported to a
manager, it will be propagated up through its ancestors – the managers of parent modules – until it reaches the root
manager for the application.

It's possible to listen for errors as they pass through specific managers. This makes it easy, for example, to listen
for errors across the application (from the root manager) and report them to a remote service such as
[sentry.io](https://sentry.io).

### Error types

There are two types of errors that can be sent into managers.

- **Passive errors** are errors that indicate a failure has occurred but is safe to ignore or has been recovered from.
  The application will continue operating normally.
- **Critical errors** are errors that indicate a significant failure has occurred and cannot be recovered from.
  The application will shut down immediately.

From a logging perspective, passive errors are emitted under the `Error` logging level while critical errors are
emitted under the `Critical` logging level.

## Reporting errors

### Manual reporting

To report a **passive error** from a service, controller, or module, use the `emitPassiveError()` method on the nearest
available error manager object.

```ts
this.errors.emitPassiveError(new Error('Just a scratch!'));
```

To report a **critical error**, use the `emitCriticalError()` method instead.

```ts
this.errors.emitCriticalError(new Error('I need a restart!'));
```

In both cases, you can chain errors by supplying the original error in the second argument of the emit method,
preserving the original message and stack as well.

```ts
catch (error) {
	this.errors.passive(new Error('Task failed'), error);
}
```

The full stack for each error in the chain will still be available when handling the error. However, the resulting
error will be logged by the framework as the following:

```
Error: Task failed: This is the original error message
    at <original stack>
	from Error at <outer stack throw statement>
```

### From event emitters

In cases where you have an event emitter with an `error` event, you can easily attach it to the nearest manager and it
will listen to this event for you.

```ts
const emitter = new EventEmitter();

// Attach the emitter (listens to the 'error' event)
this.errors.attach(emitter);

// The manager will emit and propagate the error
emitter.emit('error', new Error());
```

These errors will be passive by default, however you can indicate to the manager that they are critical by passing
`true` as the second parameter:

```ts
this.errors.attach(emitter, true);
```

!!! warning
	Please note that emitters are never detached from the manager automatically, so you could end up with a memory
	leak unless you detach them using `detach()`.

### From promises

You can also use the above `attach()` method on promises to easily catch any errors they reject with. The manager will
listen for those rejections in the background.

```ts
this.errors.attach(Promise.reject());
```

### Detaching objects

To detach a promise or emitter from the manager, use the `detach()` method.

```ts
this.errors.detach(emitter);
```

This is typically not necessary for promises, as they will automatically be detached after they resolve or reject.
However, emitters can emit more than one error, so they will never detach on their own and must be managed properly to
avoid memory leaks.

## Handling errors

As mentioned in the introduction above, errors propagate up the error manager chain until they reach the root manager.
You can use the `on()` and `once()` methods to listen for errors as they travel through those managers.

When listening for errors, you will receive an `ErrorEvent` instance containing information about them, as well as
a method to stop them from propagating further if you desire.

To handle errors, first identify on which error manager you would like to listen. For example, the root application's
manager will receive all errors across the entire application, while a module's manager will only receive errors
originating from it or its children.

Then listen for the `passive` or `critical` events to intercept those error types.

```ts
app.errors.on('passive', event => {
	console.error('Intercepted:', event.error);
	console.error('Emitted by:', event.sender);
});
```

You can stop the error from propagating further using the `stopPropagation()` method.

```ts
event.stopPropagation();
```

You can also prevent the error from being logged without preventing it from propagating further up the chain using
the `stopOutput()` method.

```ts
event.stopOutput();
```

## Transforming errors

You can transform errors as they pass through managers using the `ErrorEvent` instances provided in the events
demonstrated above.

In the following example, we'll use the `transform()` method to chain errors coming from a specific module such that
the topmost error is an `InternalServerErrorException` instance.

```ts
httpModule.errors.on('passive', event => {
	event.transform(new InternalServerErrorException());
});
```

If you don't silence or stop the error from propagating, it will appear in the application's output under the `Error`
logging level looking something like this:

```
InternalServerErrorException: This is the original error message
    at <original stack>
	from Error at <transform call>
```

## Creating managers

In some circumstances you may wish to create your own managers. You have two options – you can spawn a child manager
from an instance somewhere in the application, or construct a manager manually and then attach it to the application.

To spawn a child manager, invoke the `createManager()` instance and pass a reference to the object you wish to deem
the "sender" of its errors. Those errors will automatically be propgated up to the parent manager.

```ts
const manager = app.errors.createManager(this);
```

To construct a new manager on your own, pass the same arguments. You may then attach it to a parent manager who will
receive your errors using the parent manager's `attach()` method.

```ts
const manager = new ErrorManager(this);
app.errors.attach(manager);
```
