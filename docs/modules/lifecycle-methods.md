# Lifecycle methods

## Introduction

Modules and services have a variety of **lifecycle methods** which are invoked at different points in the application's
execution. You can use these methods to run code at ideal times, and to dynamically set a module's imports.

## Available methods

### `#!ts onModuleRegister()` { data-toc-label="onModuleRegister", id="onModuleRegister" }

> Invoked on modules when they are first registered into the application, immediately before nested modules are
> resolved. You can use this method to dynamically configure a module's imports if you'd like.

### `#!ts beforeModuleBoot()` { data-toc-label="beforeModuleBoot", id="beforeModuleBoot" }

> Invoked on modules and services immediately before the first service in the module is started.

### `#!ts onModuleBoot()` { data-toc-label="onModuleBoot", id="onModuleBoot" }

> Invoked on modules and services after the last service in the module has finished starting.

### `#!ts beforeModuleShutdown()` { data-toc-label="beforeModuleShutdown", id="beforeModuleShutdown" }

> Invoked on modules and services immediately before the first service in the module is stopped.

### `#!ts onModuleShutdown()` { data-toc-label="onModuleShutdown", id="onModuleShutdown" }

> Invoked on modules and services after the last service in the module has finished shutting down.
