# Configuring applications

## Introduction

Each application starts with a single root module. However, we use a special class called `Application` rather than the
traditional `Module` class for this purpose, as the root application instance holds many distinct properties.

Like other modules, the `constructor()` must be overridden and the `super()` constructor must be subsequently invoked
to configure the module and its imports.

```ts
export class App extends Application {
	public constructor() {
		super({
			// Options go here
		});
	}
}
```

## Options

### `#!ts name?: string` { data-toc-label="name", id="property:name" }

> The optional name of the application.

### `#!ts description?: string` { data-toc-label="description", id="property:description" }

> The optional description of the application.

### `#!ts imports?: Importable[]` { data-toc-label="imports", id="property:imports" }

> An array of modules to import into the root application module.

### `#!ts services?: Constructor<Service>[]` { data-toc-label="services", id="property:services" }

> An array of services to register into the root application module.

### `#!ts controllers?: Constructor<Controller>[]` { data-toc-label="controllers", id="property:controllers" }

> An array of controllers to register into the root application module.

### `#!ts envPrefix?: string` { data-toc-label="envPrefix", id="property:envPrefix" }

> The prefix to prepend to all environment variables in the application.

### `#!ts extensions?: FrameworkExtension[]` { data-toc-label="extensions", id="property:extensions" }

> An array of extensions to register into the application.
