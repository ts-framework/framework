# Adding requests

Requests are similar to [events](adding-events.md) except they can return a response. It's quite similar to remote
functions, except they are local. :thinking:

This is useful when running your application alongside another instance or framework. It allows the applications to
query information from one another.

## Creating requests

The standard convention for this framework is to create namespaces with request classes inside, thus creating a
structure similar to an enum.

```ts
export namespace ExampleRequest {

	/**
	 * Adds two or more numbers together and returns the sum.
	 */
	export class Add extends Request<number[], number> {}

}
```

## Sending requests

You can then send requests from the application's request manager.

```ts
const sum = await app.requests.emit(ExampleRequest.Add, [1, 2, 3]);
console.log(sum); // 6
```

## Handling requests

You can handle requests from both services and controllers by using the `#!ts @RequestHandler` decorator along with the
request class as the parameter type.

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

You must use the `resolve()` method to respond with a value, and the `reject()` method to respond with an error.

## Multiple handlers

If a request has multiple handlers available, the first handler that was registered will be invoked, and the others
will be ignored.

If a handler does not wish to handle a request, it can use the `propagate()` method to pass it onto the next available
handler instead.

```ts
request.propagate();
```
