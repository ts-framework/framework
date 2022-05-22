# Creating modules

This framework uses a concept called **modules** to help organize code. You'll want to bundle related services,
controllers, utilities, and other code together inside modules. You can also create nested modules to break down
complex logic into smaller parts.

You've already created your first module in fact – the root application class is actually a module, and it can even
host its own services and controllers, although this is not recommended as it's best to put those in dedicated modules
instead.

## File structure

It's important to have an idea on the file structure you'd like to use. The general convention around here is
something like this:

```
src/
├── example/
│   ├── ExampleController.ts
│   ├── ExampleModule.ts
│   └── ExampleService.ts
├── advanced/
│   ├── controllers/
│   │   ├── AdvancedController1.ts
│   │   └── AdvancedController2.ts
│   ├── modules/
│   │   ├── submodule1/
│   │   └── submodule2/
│   ├── services/
│   │   ├── AdvancedService1.ts
│   │   └── AdvancedService2.ts
│   └── AdvancedModule.ts
├── App.ts
└── main.ts
```

Feel free to use whatever file structure works best for you!

## Create the module class

Create a class called `ExampleModule` that looks like the following:

```ts title="src/example/ExampleModule.ts"
import { Module } from '@ts-framework/framework';
import { App } from '../App';

export class ExampleModule extends Module<App> {
	public constructor() {
		super({
			imports: [],
			services: [],
			controllers: [],
		});
	}
}
```

Note the generic in the parent class `#!ts Module<App>`. It's not required, but you should always add a generic
pointing to the parent in the hierarchy, all the way up to the root application. This will unlock some extra type
hinting that will come in handy later.

## Import the module

With the module's class defined, now we must import it inside a parent module. Let's go back and import it inside the
root application module:

```ts title="src/App.ts"
import { Application } from '@ts-framework/framework';
import { ExampleModule } from './example/ExampleModule';

export class App extends Application {
	public constructor() {
		super({
			imports: [ExampleModule],
		});
	}
}
```
