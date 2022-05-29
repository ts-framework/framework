# Implementing services

Services are special classes that host some kind of background activity or process. They can be started and gracefully
stopped upon request, and can even extend the functionality of the framework through the attributes system.

## Implementation

```ts
@Injectable()
export class ExampleService extends Service<ExampleModule> {

	/**
	 * Invoked immediately before the service is started for the first
	 * time to register attributes and perform any other one-time operations.
	 * This method will not be called again for the duration of the process.
	 */
	protected override async register() {

	}

	/**
	 * Starts the service.
	 */
	protected override async start() {

	}

	/**
	 * Stops the service.
	 */
	protected override async stop() {

	}

}
```

## Dependencies

You can utilize dependency injection to obtain instances of other classes, including other services, in the
application. When importing other services, the framework will automatically load the service's dependencies first,
before it constructs the dependent service.

```ts
public constructor(protected readonly other: OtherService) {
	super();
}
```

Make sure that you've applied the `#!ts @Injectable()` decorator to the class, otherwise the framework won't be able
to see the types of your parameters.

## Registering services

The `register()` method is invoked once when the service is started for the first time in an application. This makes it
the ideal place to implement service attributes and other one-time logic.

## Starting services

The `start()` method in each service should asynchronously start all tasks that the service will be performing, and
should not resolve until they have all been successfully started.

You should throw errors from this method if the service is unable to start. In such a case, the framework will invoke
the `stop()` method to stop any tasks that started before the error, and will terminate the startup.

## Stopping services

The `stop()` method in each service should asynchronously stop all tasks that it was performing, and should not resolve
until any outstanding tasks have completed.

You should avoid throwing errors from this method. If errors are encountered that may be ignored, use the
`#!ts this.errors.emitPassiveError()` method to log it. If an error cannot be ignored, then throw it – the framework
will terminate the process due to an unsafe shutdown.

## Error handling

Services will typically be running tasks in the background while the application is running. Sometimes, they may
encounter errors, but due to the asynchronous nature of services, the framework cannot see any errors that are thrown
from the background.

Instead of throwing errors, use the service's error manager to log it.

```ts
this.errors.emitPassiveError(new Error('This error is safe to ignore!'));
this.errors.emitCriticalError(new Error('Stop the application!'));
```

The error manager exposes methods to easily listen for promise rejections and `error` events from event emitters. For
all the details, check out the [error handling](../techniques/error-handling.md) technique guide.

By using the error manager instead of throwing, the application and its modules can intercept, transform, and report
those errors.
