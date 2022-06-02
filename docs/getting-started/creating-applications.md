# Creating applications

## Create the application class

Create a class called `App` to act as the root module of the application. This class will extend the abstract
`Application` class exposed by the framework. You must then invoke the `#!ts super()` constructor to set the
application's options.

```ts title="src/App.ts"
import { Application } from '@ts-framework/core';

export class App extends Application {
	public constructor() {
		super({
			imports: [],
		});
	}
}
```

## Starting the application

With the root application module defined, let's edit the main entry file of your project such as `main.ts` and attach
the application to the process.

```ts title="src/main.ts"
import { App } from './App';

app.attach();
```

The `#!ts attach()` method is a shortcut that configures the logging level, attaches logging transports, intercepts
terminational signals (for a graceful exit), and then starts the application.
