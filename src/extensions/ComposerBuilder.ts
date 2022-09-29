import { Type } from '@baileyherbert/types';
import { Application } from '../application/Application';
import { Composer } from './Composer';
import { FrameworkExtension } from './FrameworkExtension';

export class ComposerBuilder {

	public constructor(public readonly application: Application, private readonly extension: FrameworkExtension) {

	}

	/**
	 * Attaches a handler to the given type for augmentation and composition. Whenever the application constructs an
	 * instance of that type, assuming the type allows augmentation, the handler will be invoked and can be used to
	 * modify the instance.
	 * @param type
	 * @param handler
	 */
	public attach<T extends object>(type: Type<T>, handler: ComposerHandler<T>) {
		this.application.extensions._attachComposer(this.extension, type, handler);
	}

}

type ComposerHandler<T extends object> = (composer: Composer<T>) => any;
