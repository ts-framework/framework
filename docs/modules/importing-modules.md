# Importing modules

There are various ways to import modules into the application (or underneath other modules). Some of these methods are
more advanced than others but unlock additional functionality.

## Standard imports

Importing modules in the most basic form can be done by supplying the module's constructor. The framework will then
create instances of that module with default options.

```ts
{
	imports: [ExampleModule]
}
```

## Configured imports

Passing an object with an `import` property set to the module constructor will allow you to pass additional options for
the module to override its logging level, set custom logging levels, and set its environment prefix.

```ts
{
	imports: [
		{
			import: ExampleModule,
			logging: LogLevel.Information,
			environment: {
				EXAMPLE: 'Override the environment'
			}
		}
	]
}
```

All modules also have a static method called `withOptions()` that can be used as a shortcut for the above code.

```ts
{
	imports: [
		ExampleModule.withOptions({
			import: ExampleModule,
			logging: LogLevel.Information,
			environment: {
				EXAMPLE: 'Override the environment'
			}
		})
	]
}
```

## Environment imports

All modules have a static method called `withEnvironment()` that can be used to import the module with specific
environment variable overrides.

```ts
{
	imports: [
		ExampleModule.withEnvironment({
			EXAMPLE: 'Override the environment'
		})
	]
}
```

There is also an asynchronous version called `withEnvironmentAsync()` that can reference environment variables or
methods from the current module.

```ts
{
	imports: [
		ExampleModule.withEnvironmentAsync(() => ({
			EXAMPLE: this.env.MESSAGE,
			ANOTHER: this.environment.get('NAME')
		}))
	]
}
```

## Environment prefix imports

All modules have a static method called `withEnvironmentPrefix()` that can be used to quickly import the module with
a custom environment prefix. This prefix will be prepended to all configured environment variables under the module
(recursively).

```ts
{
	imports: [
		ExampleModule.withEnvironmentPrefix('EXAMPLE_')
	]
}
```
