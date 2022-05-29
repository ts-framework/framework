# Tracking promises

## Introduction

Applications frequently perform asynchronous tasks as part of their operation, so they frequently work with promises.
When an application is shutting down, it can be easy to leave some promises behind untracked.

It's your responsibility to ensure all promises you create are resolved before your service shuts down. The framework
makes some tools available to help implement this functionality.

## Tracking a promise

When your service generates a promise in some way, it should pass the promise into the internal promise manager. You
can do this while using `await` on the promise, for example:

```ts
await this.promises.track(this.doSomethingAsync());
```

Now when the service is asked to shut down, your `stop()` method will be called like normal, and you will cease the
operation of the service as well as the generation of further promises.

Once the `stop()` method has resolved, the framework will wait for the internal promise manager to signal that
all tracked promises have resolved.

## Waiting for promises

In some cases, you may wish to wait for all of the tracked promises to complete at a particular moment within your
`stop()` method rather than afterwards.

To wait for all tracked promises to complete, use `waitAll()`.

```ts
await this.promises.waitAll();
```

Note that waiting for promises has a default timeout of `60000` milliseconds. You can override this by passing a new
duration in the first parameter.

```ts
await this.promises.waitAll(10000);
```

When all of the promises finished, `true` is returned. If one or more promises timed out, `false` is returned instead.
