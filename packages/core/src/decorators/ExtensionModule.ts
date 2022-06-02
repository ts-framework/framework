import { Constructor } from '@baileyherbert/types';
import { ExtensionRegistry } from '../extensions/ExtensionRegistry';
import { FrameworkExtension } from '../extensions/FrameworkExtension';
import { Module } from '../modules/Module';

export function ExtensionModule<T extends Constructor<FrameworkExtension>>(extension: T, ...args: ConstructorArgs<T>) {
	return function(constructor: Constructor<Module>) {
		ExtensionRegistry.register(constructor, extension, args);
	};
}

type ConstructorArgs<T> = T extends new (...args: infer U) => any ? U : [];
