import { Attribute, AttributeMethodEvent, ReflectionClass } from '@baileyherbert/reflection';
import { Controller } from '../controllers/Controller';
import { Request } from '../services/requests/Request';
import { RequestRegistry } from '../services/requests/RequestRegistry';
import { Service } from '../services/Service';

class RequestHandlerImpl extends Attribute<Service | Controller> {

	public override onMethod(event: AttributeMethodEvent<Service | Controller>) {
		const param = event.reflection.getParameter(0);

		if (!param) {
			throw new Error(
				`Could not set method ${event.reflection.class.name}.${event.methodName.toString()}() as a request ` +
				`handler: missing request parameter #0`
			);
		}

		if (!param.isClassType) {
			throw new Error(
				`Could not set method ${event.reflection.class.name}.${event.methodName.toString()}() as a request ` +
				`handler: request parameter #0 is not a class type`
			);
		}

		const reference = new ReflectionClass(param.getType());

		if (!reference.hasAncestorType(Request)) {
			throw new Error(
				`Could not set method ${event.reflection.class.name}.${event.methodName.toString()}() as a request ` +
				`handler: request parameter #0 does not extend the base Request class`
			);
		}

		RequestRegistry.register(event.reflection.class.target, event.methodName as string, reference.target);
	}

}

/**
 * Marks a method as a request handler. The method must have a single argument which refers to the target request class.
 */
export const RequestHandler = Attribute.create(RequestHandlerImpl);
