import { Attribute as ReflectionAttribute } from '@baileyherbert/reflection';
import { Controller } from '../../controllers/Controller';
import { Service } from '../Service';
import { AttributeRegistry } from './AttributeRegistry';

export abstract class Attribute extends ReflectionAttribute<Component> {

    /**
     * Creates an invokable decorator from an attribute implementation. The returned value can be used as both a class
     * constructor and a decorator.
     *
     * When creating an attribute, you should export this value, rather than the class itself. You can also pass the
     * attribute class into this method as an anonymous or returned class.
     *
     * @param attribute
     * @returns
     */
	public static override create<T extends IAttributeConstructor>(attribute: T) {
		const instance = super.create(attribute);
		AttributeRegistry.register(instance);
		return instance;
	}

}

type IAttributeConstructor = new (...args: any[]) => Attribute;

export type Component = Controller | Service;
