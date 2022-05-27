# Implementing state

## Introduction

As part of their operation, services often keep track of their state using properties on their classes. When services
shut down, it is their responsibility to completely clean up and reset all state back to their initial values.

However, this can be annoying to implement each time you develop a service. For this reason, the framework exposes a
protected object on services called `state` which helps implement this behavior automatically.

In the following example, we create a property called `#!ts startCounter: number` which is incremented each time the
service starts.

```ts
export class ExampleService extends Service<ExampleModule> {

	protected startCounter = this.state.create(0);

	protected async start() {
		this.startCounter++;
	}

}
```

Without using managed state, this number would indeed increment each time, but with our managed state it can never
exceed `1` because it is reset back to the initial value (`0`) when the service stops.

## Methods

### Creating state

Invoke the `#!ts create<T>()` method to create a new managed state property with the given default value. You can pass
the type in `<T>` or infer it from the default value. If a default value is not supplied, `undefined` will
automatically be appended to the possible types.

```ts
protected num = this.state.create(0);
protected numArray = this.state.create<number[]>([]);
```

### Resetting state

Invoke the `clear()` method to clear all managed state in the parent service and reset them back to their default
values. This is done automatically by the framework when the service stops.

```ts
this.state.clear();
```

## Supported types

When the service is restarted, all managed state properties are reverted to *new copies* of their initial values.
This means it needs to be able to create copies of your initial value. At this time, the types of values it can make
copies of include:

- Primitives
- Arrays
- Objects
- Maps
- Sets
- Arrow functions

## Internals

It might be important to understand how this functionality works.

The `create()` method actually returns a unique symbol that identifies that individual state property. Then, when the
service is registered, the state manager looks over its properties for those symbols, thus associating property names
to their values.

Once the properties have been identified, they are set to copies of the default values. The `clear()` method then
sets them back to new copies of those default values.

For these reasons, the `create()` method can only be used at construction time. Attempting to create managed state
properties at any other point during runtime will raise an error.
