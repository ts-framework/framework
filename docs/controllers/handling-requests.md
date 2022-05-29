# Handling requests

## Handling with decorations

You can turn controller methods into request handlers with the `#!ts @RequestHandler` decorator. For this to work,
you'll also need to specify the request class as its sole parameter.

```ts
@RequestHandler
protected onAdd(request: ExampleRequest.Add) {
	let sum = 0;

	for (const number of request.data) {
		sum += number;
	}

	request.resolve(sum);
}
```

The framework will attach these methods to the root request manager at startup. It will use runtime reflection to
identify the target request type from the parameters.

## Handling manually

You can utilize the application's root request manager to manually register handlers.

```ts
app.requests.register(ExampleRequest.Add, request => {
	request.resolve(6);
});
```

At this time, these handlers are permanent once attached.

## Error handling

When an error is thrown from a request handler, the error will be propagated to the caller, and it will be up to the
caller to handle it. Errors can also be thrown for the caller if no handlers are available to handle the request.
