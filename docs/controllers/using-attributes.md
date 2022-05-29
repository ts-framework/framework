# Using attributes

## Creating attributes

Make sure to read the services guide on [adding attributes](../services/adding-attributes.md) to the application. It
also talks about what attributes are and how they're useful.

## Using attributes

Attributes are decorators and can be applied to classes, methods, properties, and parameters. Each attribute can
define which of those four target types it's applicable to, so you won't be able to use every attribute for every type.

```ts
@AttributeName()
export class ExampleController extends Controller<ExampleModule> {

	@AttributeName()
	public async method() {

	}

}
```

Attributes do not extend functionality on their own. In order for them to do anything, they'll need an associated
service to power them. If you're using third party attributes, make sure you've also imported its module into your
application.
