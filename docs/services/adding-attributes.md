# Adding attributes

Attributes are special decorators that your services can use to implement special functionality, create shortcuts,
and even create entire new frameworks.

## Creating attributes

The following example shows the implementation of an attribute class and its conversion into a decorator called
`#!ts @Example()`.

```ts
export const Example = Attribute.create(class extends Attribute {

	public constructor(public readonly message?: string) {
		super();
	}

	public override onClass(event: AttributeClassEvent<Component>) {}
	public override onMethod(event: AttributeMethodEvent<Component, any>) {}
	public override onProperty(event: AttributePropertyEvent<Component>) {}
	public override onParameter(event: AttributeParameterEvent<Component>) {}

});
```

### Overrides

In the above example, you see four blank methods have been implemented, one for each of classes, methods, properties, and
parameters.

These methods are special. If you don't override them, the `#!ts @Example()` decorator won't be applicable to those
types. Indeed, this means if you only override the `onClass()` method, the decorator can only be used on classes.

This override magic works even if the method is blank, you simply need to override it. The decorator will be guarded
against use on non-overridden types both by the TypeScript compiler and at runtime.

### Decorations

The above four methods are invoked at decoration time. If you wish to perform any logic when the decorator is applied,
just like you would with a traditional decorator function, you can place that logic in those methods.

## Using attributes

The above attribute supports all four target types, so it can be used across the application in other services and
components.

```ts
@Example('Enter a message here!')
export class ExampleController extends Controller {
	@Example()
	protected async test() {
		this.logger.info('The test method was invoked.');
	}
}
```

## Handling attributes

The above attribute is useless on its own. You'll also want to handle the attribute inside a corresponding service to
implement some associated behavior.

```ts
protected override register() {
	const classes = this.application.attributes.getClasses(this, Example);
	const methods = this.application.attributes.getMethods(this, Example);

	for (const registration of classes) {

	}

	for (const registration of methods) {

	}
}
```

The above code will iterate over the registrations for all classes and methods that use the `#!ts @Example()` decorator.
There will be one registration per class and per method.

These registration objects can be used to obtain information about the attribute and the class instances that use it.
You can also obtain each attribute instance, and in the case of method attributes, you can invoke those methods easily
using dispatchers.

### Getting attribute instances

The `attributes` property obtains an array of all attribute instances that were applied to the target class, method,
property, or parameter. The decorator can be used multiple times for each, after all.

```ts
for (const attribute of registration.attributes) {
	this.logger.info(attribute.message);
}
```

You can also use the `first()` and `last()` methods to obtain the first or last attribute instance that was applied to
the target.

```ts
this.logger.info(registration.first().message);
```

### Getting target instances

This framework allows modules to be imported multiple times, which creates multiple instances of all the services and
controllers in them.

Perhaps our decorator above was used on a service called `ExampleService`, but this service is in a module that was
imported twice. We can obtain all instances of the target class with the `targets` property.

```ts
for (const target of registration.targets) {
	// All targets will be instances of the same class ...
	// where our decorator was used
}
```

### Reflecting on targets

For advanced use cases, a reflection object is provided with each registration. The type of reflection object will
vary depending on the type of target, for example methods will receive a `ReflectionMethod` instance.

```ts
this.logger.info(registration.reflection.name);
this.logger.info(registration.reflection.getParameters());
```

You can use reflection to query other attributes that have been attached on the target classes, methods, properties,
and/or parameters.

### Dispatching methods

Method attributes are special in that the underlying methods can be invoked by the service that handles them. A great
example of this would be `#!ts @Get()` and `#!ts @Post()` decorators which set up and handle routes on a web server.

Method registrations expose a `dispatchers` property that contains a dispatcher for each instance of the target class.

This dispatcher can invoke the method with dependency injection. It inherits from the application's container, and
can also be customized.

In the following example, we'll invoke methods that use the `#!ts @Example(message)` decorator with dependency
injection. If the method has a parameter named `message`, we'll also replace it with the message in the first attribute.

```ts
for (const dispatcher of registration.dispatchers) {
	dispatcher.setNamedParameter('message', registration.first().message);
	dispatcher.invoke();
}
```

Dispatchers can set four types of overrides for injection:

- `#!ts setNamedParameter(name: string, value)`
- `#!ts setPositionalParameter(index: number, value)`
- `#!ts setTokenParameter(token: any, value)`
- `#!ts setTypedParameter(type: Type<any>, value)`

## Use cases

You'll always want to implement attributes from a service's `register()` method, but how you go from there is entirely
up to you.

You could apply the attributes directly onto an object initialized at construction time, or you could store information
about the attributes in properties and apply them when the service starts.
