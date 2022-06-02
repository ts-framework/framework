# Installation

## Configuration

### TypeScript

Make sure the `tsconfig.json` file for your project contains the following required settings:

```ts
{
	"compilerOptions": {
		"emitDecoratorMetadata": true,
		"experimentalDecorators": true
	}
}
```

### Browsers

The `emitDecoratorMetadata` property is not supported for ESBuild, which is a common build tool for front-end bundlers
and development servers. It is recommended to use [`swc`](https://github.com/swc-project/swc) instead when using this
framework in a front-end project.

## Installation

Add the framework into your project as a production dependency.

```
npm install @ts-framework/core
```

It is recommended that the very first import in your project is the `@ts-framework/core` package, as this will ensure
runtime reflection is configured before the rest of your code runs.
