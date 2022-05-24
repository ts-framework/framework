# Using extensions

## Introduction

You can add a lot of functionality to your applications with attributes, but one of the primary goals for this
framework is to keep all the essential near developers at all times.

We achieve this by exposing them as properties on the `Service`, `Controller`, `Module`, and `Application` classes,
so that your most important and frequently-used tools are one `#!ts this` away at all times.

But what if there's something missing? Well, it's very easy to add additional properties and methods to these core
classes – and to run code when they are instantiated, started, and stopped – using the built-in **extensions** system.

Some of the official framework packages use extensions to implement their features, including:

- `@ts-framework/storage`
- `@ts-framework/scheduling`
- `@ts-framework/queues`

## Installing extensions

First, install the extension into your project as a dependency.

```
npm install @ts-framework/storage
```

Then import the extension into the `extensions` option for your application.

```ts
import { StorageExtension } from '@ts-framework/storage';

export class App extends Application {
	public constructor() {
		super({
			extensions: [
				new StorageExtension()
			]
		})
	}
}
```

These extension constructors might accept options to customize their behavior. You'll also need to make sure that the
extensions you import are compatible with the framework's current major version, otherwise you might receive an error
on the `#!ts new StorageExtension()` line.

With the extension imported into the application as shown above, it will take effect immediately, and you can begin
using any properties and methods it added to the core classes.

!!! tip
	If your editor or compiler is telling you that any newly-added properties and methods don't exist, you may need to
	give it a restart before the new types will be recognized.
