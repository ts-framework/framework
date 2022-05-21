# Creating events

This framework introduces a simple concept called **service events** that makes it extremely easy to listen to and
handle events from anywhere in your application. As the name implies, these events typically originate from services
as part of their background work.

Traditionally, events in the JavaScript ecosystem have used strings as their identifiers. This leads to some difficulty
when dealing with collisions and type hinting. Here, we use classes instead of strings for our events, and this solves
both of those problems.

## Create the event namespace

The current convention is export a service's events within a namespace. Let's create a simple `ExampleEvent` namespace
within our module's directory. You can skip this step if you'd like.

```ts title="src/example/ExampleEvent.ts"
export namespace ExampleEvent {

}
```

## Create the event class

Now export a class inside the namespace, making sure to extend the base `Event<T>` class. If the `T` decorator is not
supplied, the event will not accept any data, otherwise you may specify the type of data it accepts.

Let's create an event called ` ExampleEvent.IntervalInvoked` that accepts an object as its data type. Inside this
object, we'll pass a random number, because why not?

```ts title="src/example/ExampleEvent.ts"
import { Event } from '@ts-framework/framework';

export namespace ExampleEvent {

	/**
	 * Emitted when the example service's interval is invoked. The service
	 * will generate and pass a random number with each invocation.
	 */
	export class Interval extends Event<{ randomNumber: number }> {}

}
```

## Handle the event

Let's go back to the `ExampleController` class and add a method to handle this event. You can give this method any
name, as long as it has the `#!ts @EventHandler` decorator and accepts the event as its sole argument.

```ts title="src/example/ExampleController.ts"
import { Injectable, Controller, EventHandler } from '@ts-framework/framework';

@Injectable()
export class ExampleController extends Controller {

	@EventHandler
	public onInterval(event: ExampleEvent.Interval) {
		this.logger.info(
			'Got an invocation with random number:',
			event.data.randomNumber
		);
	}

}
```

## Emit the event

Now let's go back to the `ExampleService` class and change the interval's callback to generate a random number and
emit the event.

```ts title="src/example/ExampleService.ts"
import { Injectable, Service } from '@ts-framework/framework';

@Injectable()
export class ExampleService extends Service {

	private interval?: NodeJS.Timeout;

	public constructor() {
		super();
	}

	protected override async start() {
		this.logger.info('Creating the interval');
		this.interval = setInterval(() => {
			this.emit(ExampleEvent.Interval, {
				randomNumber: Math.floor(Math.random() * 1000)
			});
		}, 1000);
	}

	protected override async stop() {
		if (this.interval) {
			this.logger.info('Clearing the interval');
			clearInterval(this.interval);
		}
	}

}
```

After saving and running with the new changes, you will immediately see the controller logging a new random number
with each passing second. :ok_hand:

## Learn more

Events are emitted globally and can be handled by controllers across the application, including in unrelated modules.
This is possible due to the fact that each event class is its own unique signature, thus preventing collisions.

You can also emit and listen for events manually using the application's event manager, however using the `emit()`
method inside services is preferred.

```ts
// Emitting events
app.events.emit(ExampleEvent.Interval, {
	randomNumber: 0
});

// Listening to events
app.events.on(ExampleEvent.Interval, event => {
	console.log(event.data.randomNumber);
});
```

For more advanced usage details, check out the complete [service events guide](../services/adding-events.md).
