# Configuration

The framework uses environment variables for its configuration. Each module in the application has an opportunity to
define the environment variables it would like to use. These variables are then validated and guaranteed to exist.

## Adding configuration to a module

To declare a module's environment configuration, extend the protected `onEnvironment()` method. You will receive an
instance of `EnvironmentManager` and are then expected to return the values of your variables using the `rules()`
method on that instance.

```ts
class ExampleModule extends Module<App> {

	protected override onEnvironment(env: EnvironmentManager) {
		return env.rules({
			TOKEN: env.schema.string()
		});
	}

}
```

With the above example, the application will not start unless the `TOKEN` is available either in the `.env` file or as
part of the process environment. You can learn more about declaring and validating these variables at
[`@baileyherbert/env`](https://github.com/baileyherbert/env).

## Accessing the configuration

You can retrieve values from a module's configuration using its `env` property if you have a reference to it.
The below example shows how to do this from a service, assuming the `Service<T>` generic is configured properly.

```ts
public override async start() {
	const token = this.module.env.TOKEN;
}
```

Note that these environment variables are available globally across the application and multiple modules can use the
same names. This also means you can retrieve the value using an environment manager which is commonly exposed as an
`environment` property.

```ts
public override async start() {
	const token = this.module.environment.get('TOKEN');
	const token = this.application.environment.get('TOKEN');
}
```

## Setting values on imports

It's possible to set or override the values of environment variables for specific modules (and their children) when
importing them.

```ts
export class App extends Application {

	public constructor() {
		super({
			imports: [
				ExampleModule.withEnvironment({
					TOKEN: 'Sets or overrides the value'
				})
			]
		});
	}

}
```

In these cases, the module's `environment` and `env` properties will see the overridden value, but the rest of the
application will not. This makes it great for module-specific configuration, and the values can be any type!

Note that these custom values remain subject to validation by the imported module or its children via their
`onEnvironment()` methods.

## Setting values on the application

When starting or attaching the application, you have an opportunity to set or override its environment variables
without affecting the rest of the application (or other instances of the framework).

```ts
app.start({
	environment: {
		TOKEN: 'Sets or overrides the value'
	}
});
```

## Environment prefixes

There are certain situations where you might want to apply a prefix to all environment variables within a particular
module and its children, or in some cases, the entire application:

- When multiple application are running in one process
- When multiple instances of the same module are imported

You can pass the `envPrefix` option when starting the application or when importing a module. All environment variables
within the module will then start with that prefix.

```ts
imports: [
	HttpModule.withOptions({
		envPrefix: 'HTTP_'
	})
]
```

You can also use the static `withEnvironmentPrefix()` shortcut method on the module.

```ts
imports: [
	HttpModule.withEnvironmentPrefix('HTTP_')
]
```

Now, let's assume the above `HttpModule` utilizes an environment variable named `PORT`. It's important to note that
this prefix does not apply everywhere. From within your source code, you will continue to refer to it as `PORT`. For
example, the following is valid:

```ts
imports: [
	HttpModule.withOptions({
		envPrefix: 'HTTP_',
		env: {
			PORT: 8080
		}
	})
]
```

Inside the module and its children, the environment variable will also continue to be exposed with the name `PORT`,
notably lacking the custom prefix we configured.

Instead, the prefix applies to the *outside sources* for our environment variables – that is our process environment
and our `.env` file.

```env
HTTP_PORT=8080   # Correct -- will be used by the module
PORT=8080        # Incorrect -- will not be used
```

This is an important concept, allowing you to build your modules to operate independently of others without worrying
about environment conflictions, and allowing the user to partition the environment as they desire without affecting
your usage of that environment.
