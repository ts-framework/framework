# Requests (spec)

Requests are quite similar to events, with one key difference: they are not blindly fired off, but instead actively
want a return value. This also has an important implication: that only one handler can exist for a request.

## Creating a request

```ts
export class ExampleRequest extends Request<RequestType, ResponseType> {

}
```

## Dispatching a request

Use the `emit()` method on the request manager to send a request into the application.

```ts
await application.requests.emit(new ExampleRequest(...));
await application.requests.emit(ExampleRequest, ...);
```

Here are the things that can happen after the request is sent:

- The request is sent to the last handler that was registered for it
  - The handler will handle the request.
  - The handler can also propagate the request to the next handler in line instead.
  - If no handler is available for the request, an error is thrown.
- If the handler succeeds, it can respond with a value matching the response type.
- If the handler fails, it will reject with an error.
- If the handler exits without returning a response or propagating, it will reject with an error.

## Handling a request

```ts
@RequestHandler
public onRequest(request: ExampleRequest) {

}
```

To send back a response, use the `request.resolve()` method.

```ts
return request.resolve(...);
```

To send back an error, use the `request.reject()` method.

```ts
return request.reject(new Error());
```

To propagate the request to the next available handler, use the `request.propagate()` method.

```ts
return request.propagate();
```

When the request handler throws or rejects with an error, it will automatically call the `reject()` method if not
propagated, or will print an error to the log otherwise.

```ts
@RequestHandler
public onRequest(request: ExampleRequest) {
	throw new Error();
}
```
