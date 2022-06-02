# Creating attributes

## Introduction

Here's where the fun really begins! :sparkles:

Other frameworks solve particular problems. For example, Nest.js makes it simple to interface with a web server using
decorators within controllers.

On the other hand, this framework solves no particular problems – not a single one! Instead, you can build your own
solutions to whatever problems you face using **service attributes**. Need `@Get()` and `@Post()` decorators? They
can be written in minutes!

The framework builds upon the attributes decoration concept introduced in my
[reflection library](https://docs.bailey.sh/reflection/latest/decorators/attributes/). If you're not familiar,
attributes are simple classes that are easily converted into decorators, and a class instance is preserved for each
decoration.

Services have first-class integration with attributes. The framework tracks attribute instances and makes it extremely
easy to query and interface with them.

This guide will demonstrate how to create the `@Get()`, `@Req()`, and `@Res()` decorators and bind them to a service
that spins up an `express` server. For the record, you don't actually need to do this yourself – check out the
[express integration](../integrations/express.md).

## Create the decorators

First and foremost, we'll create the `@Get()` decorator using an attribute.

```ts title="src/example/attributes/Get.ts"
import { Attribute, AttributeMethodEvent, Component } from '@ts-framework/core';

export const Get = Attribute.create(class GetAttribute extends Attribute {
	public constructor(public readonly path: string) { super(); }
	public override onMethod(event: AttributeMethodEvent<Component, any>) {}
});
```

Check the [upstream documentation on attributes](https://docs.bailey.sh/reflection/latest/decorators/attributes/) to
learn how to easily write your own attributes. In short, by overriding `onMethod()` in our implementation, we've
enabled the attribute to be used on methods, with the constructor argument `path` as its sole parameter.

### Create the helper tokens

We'll also need the `@Req()` and `@Res()` decorators to make it easier to inject the express `Request` and `Response`
types which don't have an equivalent class readily available for injection.

```ts title="src/example/decorators/Req.ts"
import { Token } from '@ts-framework/core';

export const Req = () => Token('express:request');
```

```ts title="src/example/decorators/Res.ts"
import { Token } from '@ts-framework/core';

export const Res = () => Token('express:response');
```

To make this work, we'll need to tell the dependency container what values to inject for these tokens when we invoke
the methods that use them. Fortunately, this is very easy to do with the framework's attribute system, as you're about
to see.

## Create the service

Create a new `HttpService` and register it in a module of your choosing. Then read over and implement the code show
below.

```ts title="src/example/HttpService.ts"
import { PromiseCompletionSource, Service } from '@ts-framework/core';
import { ExampleModule } from './ExampleModule';
import { Get } from './attributes/Get';
import { Server } from 'http';
import express from 'express';

export class HttpService extends Service<ExampleModule> {

	private app = express();
	private server?: Server;

	protected override register() { // (1)
		for (const registration of this.application.attributes.getMethods(Get)) {
			this.app.get(registration.first().path, async (req, res) => {
				const dispatcher = registration.dispatchers[0].clone(); // (2)

				dispatcher.setTokenParameter('express:request', req); // (3)
				dispatcher.setTokenParameter('express:response', res);

				const response = await dispatcher.invoke(); // (4)

				if (response) {
					res.send(response); // (5)
				}
			});
		}
	}

	protected override async start() {
		const source = new PromiseCompletionSource<void>();
		this.server = this.app.listen(3000, () => source.resolve()); // (6)
		return source.promise;
	}

	protected override async stop() {
		if (this.server) {
			const source = new PromiseCompletionSource<void>();
			this.server.close(() => source.resolve());
			return source.promise;
		}
	}

}
```

1. This is a special method that runs immediately before the service is started for the first time.
   It won't run again, making it great for slow, one-time operations like applying attributes.
2. The registration object for method-based attributes exposes a **dispatcher** that can be used to easily invoke the
   method with dependency injection. We're making a clone to avoid contaminating the original dispatcher object.
   It's also an array in case there are multiple instances of the same controller available.
3. Here, we're overriding the injection behavior for these specific tokens, which we set with the decorators in the
   previous section. The container will inject these values for the parameters instead.
4. This will invoke the controller method that registered the route and then forward its return value. We'll await this
   value just in case it's a promise.
5. If the controller method returned anything, let's add it to the response and send it off. This makes it easier for
   controllers to send their responses.
6. Here we do some magic to promisify the listen step. We'll repeat similar magic when closing the server.

## Using the attribute

With the attribute and service configured, we can now easily configure and handle routes from any controller in the
entire application!

```ts title="src/example/ExampleController.ts"
export class ExampleController extends Controller<ExampleModule> {

	@Get('/')
	public async index(@Req() request: Request, @Res() response: Response) {
		return 'Hello world!';
	}

}
```

Give `localhost:3000` a view and you should see the familiar greeting. :sparkles:

## Conclusion

I hope this demonstrates the versatility of this framework. In this manner, it's a framework to create other
frameworks, and most of the magic relies on the attribute system. It should be possible to recreate Nest.js in its
entirety, or to create an entirely different framework.
