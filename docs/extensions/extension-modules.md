# Extension modules

## Introduction

In some cases you may wish to create a module that automatically imports an extension into the parent application. The
special `ExtensionModule` decorator allows you to build a normal module which brings its own extension(s) to the
application if they are not already added.

## Usage

```ts
@ExtensionModule(ExampleExtension)
export class ExampleModule extends Module<App> {
	public constructor() {
		super({
			imports: [],
			services: [],
			controllers: [],
		});
	}
}
```

Now the application will ensure that the `ExampleExtension` is registered into the application before the module
import cycle even begins.

!!! warning
	This feature only works for **top level modules** (those imported directly from the root application module). It
	does not look for extensions in nested modules to ensure the extension lifecycle is consistent regardless of how
	they are imported. If that won't work for you, then import the extension directly into the application.
