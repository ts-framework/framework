# Managing applications

## Introduction

This guide shows the different ways you can start and stop your application, the associated options, and how to manage
things like errors and logging.

## Creating an instance

Before we can start the application, we'll need to acquire an instance of the application. We can't construct it
ourselves, or we'll receive an error. Instead, use the `ApplicationFactory` class to resolve an instance.

```ts
const app = ApplicationFactory.create(App);
```

## Attaching the instance

The recommended method to start an application is with the `attach()` method. This name comes from the idea that we'll
be "attaching" the application to the running process, such that when the process is running, our application is
running.

This method helps automatically configure things like logging, error handling, and graceful shutdowns when interrupt
signals are received.

```ts
await app.attach();
```

This method also accepts various options to tailor the attachment. Here are the default values of these options, with
the exception that `loggingLevel` will vary between `Information` and `Debug` depending on the current environment.

```ts
await app.attach({
	abortOnError: true,
	envFilePath: '.env',
	envPrefix: '',
	environment: {},
	interceptTerminationSignals: true,
	loggingLevel: LogLevel.Information,
	loggingTransports: [/*console*/]
});
```

The `attach()` method returns a promise that resolves once the application has stopped. You don't need to `await` this
promise if you don't want to.

## Starting manually

If you want full control over how the application is started and managed, then the `attach()` method might not be
sufficient for you. In this case, you'll want to use the `start()` method manually. This has some important caveats:

- No transports will be attached to the logger
- No graceful shutdown hooks will be implemented

To see log output, you will need to attach at least one logger transport.

```ts
const transport = new ConsoleTransport();
transport.attach(app.logger);
```

To start the application manually, use the `start()` method. A promise will be returned that resolves once the
application has shut down, or rejects with a critical error.

```ts
await app.start();
```

You should then implement logic to call and wait for the `stop()` method before the process shuts down, otherwise data
loss may occur.

```ts
await app.stop();
```

## Start options

### `#!ts abortOnError?: boolean = true` { data-toc-label="abortOnError", id="property:abortOnError" }

> Sets whether to terminate the process with an erroneous exit code if an unhandled fatal error is encountered within
> the application. Otherwise the `start()` or `attach()` methods will reject with the error.

### `#!ts envFilePath?: string = '.env'` { data-toc-label="envFilePath", id="property:envFilePath" }

> Sets the name or path of the `.env` file to use for configuration. This file does not need to exist, as the
> environment will also be loaded from the process. Set this option to `false` to disable the file entirely.

### `#!ts envPrefix?: string = ''` { data-toc-label="envPrefix", id="property:envPrefix" }

> Sets the prefix to use for environment variables in this application. The names of the variables will not change from
> the application's perspective, but must contain the prefix in the `.env` file and process environment to be
> recognized.
>
> This is ideal when running multiple applications simultaneously in the same process, in order to isolate their
> configurations.

### `#!ts environment?: Record<string, any> = {}` { data-toc-label="environment", id="property:environment" }

> Sets custom environment variables in the application. The variables defined here will override any variables loaded
> from the working environment or `.env` file.
