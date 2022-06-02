# Creating controllers

Controllers are classes that handle events dispatched by the application's services. That might sound simple, but
events in this framework come in many forms and controllers can easily become the stars of your application.

## Create the controller class

Create a class called `ExampleController` alongside its parent module that looks like the following:

```ts title="src/example/ExampleController.ts"
import { Injectable, Controller } from '@ts-framework/core';
import { ExampleModule } from './ExampleModule';

@Injectable()
export class ExampleController extends Controller<ExampleModule> {

}
```

For now, there's nothing to put in the controller, so we'll keep it empty. The next guide will modify the service to
emit events, and show how to handle those events in the controller.

## Import the controller

Go back to the `ExampleModule.ts` file and add the new class to the `controllers` array.

```ts title="src/example/ExampleModule.ts"
import { Module } from '@ts-framework/core';
import { App } from '../App';
import { ExampleService } from './ExampleService';
import { ExampleController } from './ExampleController';

export class ExampleModule extends Module<App> {
	public constructor() {
		super({
			imports: [],
			services: [ExampleService],
			controllers: [ExampleController],
		});
	}
}
```
