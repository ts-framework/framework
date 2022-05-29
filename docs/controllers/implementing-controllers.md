# Implementing controllers

Controllers are special classes that are intended solely for handling events and requests. For complex applications,
you will primarily use attributes in your controllers as well, as they can be considered special types of event
handlers.

## Implementation

```ts
@Injectable()
export class ExampleController extends Controller<ExampleModule> {

}
```

## Dependencies

If you're developing with separation of concerns, you'll likely want to import one or more services into your
controller by specifying them as constructor parameters.

```ts
public constructor(protected readonly service: ExampleService) {
	super();
}
```

Make sure that you've applied the `#!ts @Injectable()` decorator to the class, otherwise the framework won't be able
to see the types of your parameters.

## Using controllers

That's all there is to controllers! They are useless on their own, so the next few sections will show the various ways
you can utilize controllers.

- [Using attributes](using-attributes.md)
- [Handling events](handling-events.md)
- [Handling requests](handling-requests.md)
