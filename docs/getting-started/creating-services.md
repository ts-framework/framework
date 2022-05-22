# Creating services

Services are special classes that host some kind of background activity or process. They can be started and gracefully
stopped upon request, and can even extend the functionality of the framework through the attributes system (more on
that later).

## Create the service class

Create a class called `ExampleService` alongside its parent module that looks like the following:

```ts title="src/example/ExampleService.ts"
import { Injectable, Service } from '@ts-framework/framework';
import { ExampleModule } from './ExampleModule';

@Injectable()
export class ExampleService extends Service<ExampleModule> {

	private interval?: NodeJS.Timeout;

	public constructor() {
		super();
	}

	protected override async start() {
		this.logger.info('Creating the interval');
		this.interval = setInterval(() => {
			this.logger.info('The interval callback was invoked!');
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

This simple service starts a one-second interval that prints a message to the output each time. When the service is
stopped, the interval is cleared using `clearInterval()`.

### Stopping a service safely

Note how the `stop()` method defined above checks if `#!ts this.interval` has been initialized before attempting to
clear it. This is an extremely important concept.

Imagine this – the `start()` method above is called. However, before we have a chance to initialize the interval, an
error is thrown by some other code before it. The start has failed.

When a service fails to start, the framework will immediately call the `stop()` method for us to clear anything that
was initialized before the error.

## Import the service

Go back to the `ExampleModule.ts` file and add the new class to the `services` array.

```ts title="src/example/ExampleModule.ts"
import { Module } from '@ts-framework/framework';
import { App } from '../App';
import { ExampleService } from './ExampleService';

export class ExampleModule extends Module<App> {
	public constructor() {
		super({
			imports: [],
			services: [ExampleService],
			controllers: [],
		});
	}
}
```
