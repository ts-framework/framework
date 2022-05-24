# Developing extensions

Extensions allow you to add additional methods and properties to the framework's core classes, and to run code when
they are constructed, started, and stopped.

The following guide will demonstrate how to successfully add a property and method to services, controllers, and
modules.

## Install the framework

You will need to use classes and types from the framework as part of your extension. Add the framework as both a
`dev` and `peer` dependency in your `package.json`:

```json
"devDependencies": {
	"@ts-framework/framework": "^1.0.0"
},
"peerDependencies": {
	"@ts-framework/framework": "^1.0.0"
}
```

Then run `npm install` to download the new packages.

## Create the extension

First create a class that extends `FrameworkExtension`. This class has some public methods that are invoked by the
framework and must be overridden to implement your features.

```ts
import { FrameworkExtension } from '@ts-framework/framework';

export class ExampleExtension extends FrameworkExtension {

}
```

## Add methods and properties

Let's start with adding our new property to all instances of the `Service` class.

```ts
public override onServiceComposer(composer: Composer<Service>) {
	composer.createProperty('example', 'This was set from an extension');
}
```

We'll also add a method to retrieve a similar message.

```ts
public override onServiceComposer(composer: Composer<Service>) {
	composer.createProperty('example', 'This was set from an extension');
	composer.createMethod('getExampleMessage', () => {
		return 'This was returned by an extension';
	});
}
```

Now let's repeat this for the `Controller` and `Module` classes.

```ts
public override onControllerComposer(composer: Composer<Controller>) {
	composer.createProperty('example', 'This was set from an extension');
	composer.createMethod('getExampleMessage', () => {
		return 'This was returned by an extension';
	});
}

public override onModuleComposer(composer: Composer<Module>) {
	composer.createProperty('example', 'This was set from an extension');
	composer.createMethod('getExampleMessage', () => {
		return 'This was returned by an extension';
	});
}
```

## Registering the types

With the above code, our properties and methods are now applied and can already be used across your application.
However, our editors will complain that no such property or method exists as they are not part of the official types.

To address this, we'll augment the framework's types by adding the following module declarations below our extension
class.

```ts
declare module '@ts-framework/framework/dist/services/Service' {
	interface Service {
		example: string;
		getExampleMessage(): string;
	}
}

declare module '@ts-framework/framework/dist/controllers/Controller' {
	interface Controller {
		example: string;
		getExampleMessage(): string;
	}
}

declare module '@ts-framework/framework/dist/modules/Module' {
	interface Module {
		example: string;
		getExampleMessage(): string;
	}
}
```

You can then confirm the types have been added successfully by messing around with the `composer.instance` property in
your extension methods.

```ts hl_lines="7 8"
public override onModuleComposer(composer: Composer<Module>) {
	composer.createProperty('example', 'This was set from an extension');
	composer.createMethod('getExampleMessage', () => {
		return 'This was returned by an extension';
	});

	// Your editor should detect this as a (() => string) type
	composer.instance.getExampleMessage();
}
```

## Methods

### `onRegister`

You can override this method to run code when the extension is registered into the application. This happens quite
early, before modules have even been imported.

```ts
public override onRegister(application: Application) {}
```

### `onApplicationComposer`

You can override this method to augment the root `Application` module.

```ts
public override onApplicationComposer(composer: Composer<Application>) {}
```

### `onModuleComposer`

You can override this method to augment the `Module` instances.

```ts
public override onModuleComposer(composer: Composer<Module>) {}
```

### `onServiceComposer`

You can override this method to augment the `Service` instances.

```ts
public override onServiceComposer(composer: Composer<Service>) {}
```

### `onControllerComposer`

You can override this method to augment the `Controller` instances.

```ts
public override onControllerComposer(composer: Composer<Controller>) {}
```

## Techniques

### Logging

Extensions have an internal logger as well. When the extension is registered into an application, this logger is
automatically attached to the application's root logger. This happens before the extension is invoked in any way.

```ts
this.logger.info('Hello application!');
```

### Events

Most of the methods listed above receive `Composer<T>` instances that can be used to augment the target object.
However, these instances also have events that you can subscribe to within those methods.

```ts
public override onServiceComposer(composer: Composer<Service>) {
	composer.on('beforeStart', () => {
		this.logger.info(composer.reflection.name, 'is starting');
	});
}
```

These are the events you can subscribe to:

- `afterResolution` – After the framework has resolved and registered the instance
- `beforeStart` – Immediately before the target is started
- `beforeStop` – Immediately before the target is stopped
- `afterStart` – Immediately after the target was started
- `afterStop` – Immediately after the target was stopped

Note that some of these events don't apply to certain objects.

For example, the `Application` class will never trigger the `afterResolution` event because it was resolved before
extensions were loaded. In addition, controllers will never trigger the start/stop events, as they are not stateful.
