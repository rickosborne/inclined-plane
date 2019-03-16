import {Util, InjectableType} from './InjectableType';
import {ConstructedDefinition} from './ConstructedDefinition';
import {Constructor, InterfaceType, TestableInterfaceType} from './decl';

/**
 * Find or generate a managed type definition for the given named interface.
 * @param interfaceName Name of the interface.
 */
export function injectableType<INTERFACE>(interfaceName: string): InterfaceType<INTERFACE> {
  return InjectableType.named<INTERFACE>(interfaceName);
}

/**
 * Find or generate a managed type definition for the given named interface with additional functionality appropriate for unit testing.
 * @param interfaceName Name of the interface.
 */
export function testableType<INTERFACE>(interfaceName: string): TestableInterfaceType<INTERFACE> {
  return InjectableType.named<INTERFACE>(interfaceName);
}

/**
 * Build an instance of the given concrete constructor, injecting parameters and properties as necessary.
 * @param type Concrete constructor
 */
export function buildInstance<IMPL>(type: Constructor<IMPL>): IMPL {
  return Util.construct(new ConstructedDefinition(type));
}
