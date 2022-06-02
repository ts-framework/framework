import { Request } from './Request';

/**
 * Utility type that extracts the type of the request payload stored in the given request class.
 */
export type RequestType<R extends Request<any, any>> = R extends { data: infer T } ? T : void;
