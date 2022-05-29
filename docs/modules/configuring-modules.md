# Configuring modules

## Introduction

Modules are bundles of services, controllers, and additional nested child modules which are all related to one another.
They allow you to organize and break up your code into different sections, without preventing them from working
together.

Modules are simple classes. The `constructor()` must be overridden and the `super()` constructor must be subsequently
invoked to configure the module and its imports.

```ts
export class ExampleModule extends Module<App> {
	public constructor() {
		super({
			// Options go here
		});
	}
}
```

## Options

### `#!ts name?: string` { data-toc-label="name", id="property:name" }

> The optional name of the module.

### `#!ts description?: string` { data-toc-label="description", id="property:description" }

> The optional description of the module.

### `#!ts imports?: Importable[]` { data-toc-label="imports", id="property:imports" }

> An array of modules to import into the module.

### `#!ts services?: Constructor<Service>[]` { data-toc-label="services", id="property:services" }

> An array of services to register into the module.

### `#!ts controllers?: Constructor<Controller>[]` { data-toc-label="controllers", id="property:controllers" }

> An array of controllers to register into the module.

### `#!ts envPrefix?: string` { data-toc-label="envPrefix", id="property:envPrefix" }

> The prefix to prepend to all environment variables under the module.
