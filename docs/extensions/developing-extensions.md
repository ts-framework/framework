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
	"@ts-framework/core": "^1.0.0"
},
"peerDependencies": {
	"@ts-framework/core": "^1.0.0"
}
```

Then run `npm install` to download the new packages.

## Create the extension

First create a class that extends `FrameworkExtension`. Instances of this class can be imported into applications to
register the extension.

```ts
import { FrameworkExtension } from '@ts-framework/core';

export class ExampleExtension extends FrameworkExtension {

}
```

## Registration handler

Override the `onRegister()` method. This method will be invoked as soon as the extension is registered into an
application, and will receive a `CompositionBuilder` instance that can be used to initiate augmentation.

```ts
protected override onRegister(builder: ComposerBuilder) {

}
```

## Instance augmentation

From within the `onRegister()` method, you can use the builder instance to listen for the construction of specific
types of instances in the framework.

```ts
protected override onRegister(builder: ComposerBuilder) {
	builder.attach(Application, composer => {});
	builder.attach(Module, composer => {});
	builder.attach(Service, composer => {});
	builder.attach(Controller, composer => {});
}
```

The callbacks in these attachments will be invoked for *each* constructed instance which inherits those types along
with a `Composer` object that can be used to augment them.

!!! warning
	You can't pass *any* type in the `attach()` method and expect it to work. It only works against classes which
	invoke the `application.extensions.augment()` method at construction time. Here are the core classes that support
	augmentation in this manner:

	- `Application`
	- `Module`
	- `Service`
	- `Controller`
	- `StateManager`
	- `ScheduleManager`
	- `PromiseManager`

### Adding properties

To add a property to an instance, use the `createProperty()` method on the composer. Provide the initial value of the
property.

```ts
composer.createProperty('example', 'This was set from an extension');
```

### Adding methods

To add a method to an instance, use the `createMethod()` method on the composer. Provide a callback that will be used
as the method's implementation.

```ts
composer.createMethod('example', () => {
	return 'This was returned by an extension';
});
```

### Adding getters

To add a getter to an instance, use the `createGetter()` method on the composer. Pass a callback that will be used as
the getter's implementation.

```ts
composer.createGetter('example', () => {
	return 'This was returned by an extension';
});
```

### Adding setters

To add a setter to an instance, use the `createSetter()` method on the composer. Pass a callback that will be used as
the setter's implementation.

```ts
composer.createSetter('example', (value: any) => {
	// Do something with the value
});
```

### Descriptors

Properties, getters, and setters are added to instances via property descriptors. For advanced use cases, composers
allow you to customize the options in those descriptors. The available options and their default values are listed
below.

```ts
composer.configurable = false;
composer.enumerable = true;
composer.writable = true;
```

Please note that the above options will apply to all descriptors created by the composer, regardless of the order in
which they were registered.

## Type augmentation

The composers demonstrated above will add new properties, methods, and other descriptors to instances of core framework
classes. However, the compiler will complain that these values do not exist, because they are still not typed.

The following code demonstrates how to augment the official types for each of the core classes that support composer
augmentation.

```ts
declare module '@ts-framework/core/dist/application/Application' {
	interface Application {
		example: string;
	}
}

declare module '@ts-framework/core/dist/modules/Module' {
	interface Module {
		example: string;
	}
}

declare module '@ts-framework/core/dist/controllers/Controller' {
	interface Controller {
		example: string;
	}
}

declare module '@ts-framework/core/dist/services/Service' {
	interface Service {
		example: string;
	}
}

declare module '@ts-framework/core/dist/services/state/StateManager' {
	interface StateManager {
		example: string;
	}
}

declare module '@ts-framework/core/dist/services/scheduler/ScheduleManager' {
	interface ScheduleManager {
		example: string;
	}
}

declare module '@ts-framework/core/dist/services/promises/PromiseManager' {
	interface PromiseManager {
		example: string;
	}
}
```

## Techniques

### Logging

Extensions have an internal logger as well. When the extension is registered into an application, this logger is
automatically attached to the application's root logger. This happens before the extension is invoked in any way.

```ts
this.logger.info('Hello application!');
```

### Events

For some types, composers also emit events for their underlying instances.

```ts
composer.on('beforeStart', () => {
	this.logger.info(composer.reflection.name, 'is starting');
});
```

These are the events you can subscribe to, although usage will vary by type:

- `afterResolution` – After the framework has resolved and registered the instance
- `beforeStart` – Immediately before the target is started
- `beforeStop` – Immediately before the target is stopped
- `afterStart` – Immediately after the target was started
- `afterStop` – Immediately after the target was stopped

### Error handling

Extensions have an `error` property which exposes a dedicated error manager. When the extension is attached to an
application, this error manager is automatically propagated up into the application's root error manager.

To pipe a passive (non-fatal) error into the application at runtime, use the `emitPassiveError()` method. The
application will continue operating.

```ts
this.errors.emitPassiveError(new Error('Something went wrong'));
```

To pipe a critical (fatal) error into the application at runtime, use the `emitCriticalError()` method. The application
will shut down due to the error.

```ts
this.errors.emitCriticalError(new Error('Something went wrong'));
```
