# Logging

This framework has a sweet little logging utility that is easy to access from virtually anywhere, and is highly
configurable.

## Retrieving loggers

Each service, controller, and module in the application has a built-in logger that can be accessed with the protected
`logger` property. For example:

```ts
public override async start() {
	this.logger.info('Starting the service!');
}
```

## Writing output

There are six different logging levels that can be used for output:

```ts
this.logger.trace('For the most detailed output');
this.logger.debug('For investigation during development');
this.logger.info('For tracking the flow of the app');
this.logger.warning('For abnormal or unexpected events');
this.logger.error('For failures that cause an activity to stop');
this.logger.critical('For unrecoverable crashes and failures');
```

## Logging levels

You can adjust the logging level of each module as part of the module's configuration. You can also override this
configuration and enforce a logging level when importing a module.

### From module configuration

To set the logging level of a module from its configuration:

```ts
export class ExampleModule extends Module<App> {

	public constructor() {
		super({
			logging: LogLevel.Information,
			imports: [],
		});
	}

}
```

### From module imports

To enforce a logging level on a module when importing it:

```ts
super({
	imports: [
		ExampleModule.withOptions({
			logging: LogLevel.Information
		})
	]
})
```

### From application start

To enforce a logging level on the entire application when attaching it:

```ts
app.attach({
	loggingLevel: LogLevel.Information
})
```

### Logger hierarchy

It's important to understand the logger hierarchy when working with logging levels.

All of the loggers in your application are connected together in a tree-like structure, with the root application
module's logger acting as the entry point. Say you have a deeply nested service like this list:

```
App -> ExampleModule -> NestedModule -> NestedService
```

When the `NestedService` emits output using its logger, the output will propagate up the chain until it reaches the
logger for the root `App` module. As it travels up this chain, it will be subject to each logger's configured logging
level.

This means that when the `NestedService` emits output of the `Debug` level, it wouldn't arrive to the root logger where
it can be printed if any other logger between the two had a higher configured logging level than `Debug`.

!!!tip
	This design allows you to limit the amount of output that modules produce, allowing you to build and import noisy
	and debug-heavy modules without having to limit the rest of your application.

	For this system to work best, avoid configuring logging levels on your modules unless necessary. If you configure
	too many modules, it will become difficult to track and modify in the future.

## Logging to a file

### With the `#!ts attach()` method

When using the `attach()` method to start the application, you can specify an array of logging transports as part of
the attachment options. However, doing so will completely override the default transport (console), so we'll need to
add both.

```ts
app.attach({
	loggingTransports: [
		new ConsoleTransport(),
		new FileTransport({
			fileName: 'console.log'
		})
	]
});
```

You can customize the minimum logging level individually for each transport as well by passing the logging level as
the first parameter, such as:

```ts
new FileTransport(LogLevel.Error, {
	fileName: 'console.log'
})
```

Note that the file transport has built-in automatic rotation that can be configured. Check out the
[transport documentation](https://docs.bailey.sh/logging/latest/guide/transports/#file_transports) for the full details.

### With the `#!ts start()` method

You can use the built-in `createFileTransport` method on the logger when starting manually.

```ts
const app = AppFactory.create(App);

app.logger.createFileTransport({
	fileName: 'console.log'
});

app.start();
```

## Learn more

Check out the [full documentation](https://docs.bailey.sh/logging/latest/) for the logging library to learn more,
such as how to customize the prefixes and how to create your own transports (destinations) for output.
