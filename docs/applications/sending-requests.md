# Sending requests

## Emitting requests

You can send requests into an application for controllers to handle. This allows you to externally request information
from an application.

```ts
const response = await app.requests.emit(Request);
const response = await app.requests.emit(Request, ...args);
```

## Handling requests

Check out the documentation on [service requests](../services/adding-requests.md) to get started.
