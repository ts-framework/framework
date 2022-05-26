# Timeouts & intervals

## Introduction

You might be interested in using `setTimeout()` or `setInterval()` within your services at some point. If you're not
going to be using the dedicated [scheduling package](../techniques/scheduling.md) then there are some tools available
to help you.

The main issue with creating timeouts and intervals in a service is that you'll also need to implement logic to clear
them from within the `stop()` method. Instead, use managed timeouts and intervals from the service, as they will clear
automatically.

## Creating timeouts

Use the protected `scheduler.createTimeout()` method on services to create a timeout with the specified interval.

```ts
protected async start() {
	const fn = () => this.logger.info('Do something...');
	const timeout = this.scheduler.createTimeout(fn, 10000);
}
```

You can also pass a method from the service directly. In this case, the scheduler will invoke the method with `this`
set to the service instance, so you don't need to worry about that.

```ts
this.schedule.createTimeout(this.handleTimeout, 10000);
```

## Creating intervals

It's just as simple to create an interval using the `schedule.createInterval()` method.

```ts
protected async start() {
	const fn = () => this.logger.info('Do something...');
	const interval = this.scheduler.createInterval(fn, 10000);
}
```

Once again, you can pass a method on the service directly and `this` will be set to the service instance automatically.

```ts
this.scheduler.createInterval(this.handleInterval, 10000);
```

## Clearing tasks

To clear timeouts or intervals from the scheduler, use the `clearAll()` method on the object that both functions
returned. You'll need to use the `await` operator as this method waits for active callbacks to complete as well.

```ts
const timeout = this.scheduler.createTimeout();
await timeout.clearAll();
```

!!! tip
	Remember that when using the scheduler, you don't need to clear your timeouts and intervals manually. If there
	are any scheduled or active tasks when the service is stopped, it will automatically clear them and await their
	completion.

## Error handling

When errors occur inside a timeout or interval callback, it will be emitted on the service's error manager as a
passive error. Please make sure the callback does not return or resolve until it has completed so that the manager may
catch any errors which occur.

Errors caught from these callbacks will be emitted with the `ScheduleError` type chained on top of their original
errors. See the [error handling documentation](../techniques/error-handling.md) for full details on how this works.
