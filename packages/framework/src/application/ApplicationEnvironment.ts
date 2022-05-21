import { Env } from '@baileyherbert/env';

/**
 * The internal environment variable map for the framework.
 * @internal
 */
export const ApplicationEnvironment = Env.rules({

	/**
	 * The current environment for the application, such as `production` or `development`.
	 */
	NODE_ENV: Env.schema.string().optional('development'),

});
