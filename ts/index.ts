/**
 * Property key for constructors to track their params.
 * @see {ConstructorParam}
 */
export const constructorParamsKey = Symbol('inclined-plane:constructorParams');

/**
 * Property key for constructors to track properties on their prototypes.
 * We put them on the constructor instead of the prototype just to make debugging a bit easier.
 * @see {ManagedProperty}
 */
export const managedPropertiesKey = Symbol('inclined-plane:managedProperties');

/**
 * Mixin to support a callback after an instance's properties have all been injected.
 */
export interface ManagedInstance {
  postConstruct?(): void;
}

/**
 * Since {@code Function} is so limited, this is our version that accounts for the additional metadata.
 * The {@code IMPL} type is a concrete implementation class, versus an interface.
 */
export interface Constructor<IMPL extends ManagedInstance> {
  readonly name: string;
  [constructorParamsKey]?: ConstructorParam<any>[];
  [managedPropertiesKey]?: ManagedProperty<any>[];

  new(...args: any[]): IMPL;
}

/**
 * The primary interaction type for most use-cases.
 * The {@code INTERFACE} type is an interface, versus a concrete class.
 * @see {injectableType}
 */
export interface InterfaceType<INTERFACE> {
  /**
   * Decorate a property as an injection target with this type.
   */
  inject: PropertyDecorator;
  /**
   * Decorate a constructor parameter as an injection target with this type.
   * When building an instance, the value will be set to undefined if it cannot be found.
   */
  optional: ParameterDecorator;
  /**
   * Decorate a class as a concrete implementation of this type.
   */
  provider: ClassDecorator;
  /**
   * Decorate a constructor parameter as an injection target with this type.
   * When building an instance, an error will be thrown if a value cannot be found.
   */
  required: ParameterDecorator;

  /**
   * Get a singleton implementation for this interface.
   * @throws {Error} If a provider for this interface cannot be found.
   */
  getInstance(): INTERFACE;

  /**
   * Get zero or more singleton implementations for this interface.
   */
  getInstances(): INTERFACE[];

}

/**
 * Optional extra functionality intended for use in unit testing.
 * @see {testableType}
 */
export interface TestableInterfaceType<INTERFACE> extends InterfaceType<INTERFACE> {
  /**
   * Clears out cached singletons.
   */
  resetCachedImplementations(): void;
}

/**
 * Base type for an item that is injected.
 */
export interface ManagedItem<T> {
  ctor: Constructor<T>;
  interfaceType: InterfaceType<T>;
  key: string | symbol;
}

/**
 * For now, properties don't have anything extra interesting.
 */
export type ManagedProperty<PROP> = ManagedItem<PROP>;

/**
 * Constructor params have a specific ordering.
 */
export interface ConstructorParam<PARAM> extends ManagedItem<PARAM> {
  index: number;
  optional: boolean;  // default false
}

/**
 * To detect cycles we keep track of types that are currently in the middle of the building process.
 */
enum ServiceState {
  /**
   * No instances created yet.
   */
  Defined = 'Defined',
  /**
   * Instance creation has started but has not completed.
   */
  Building = 'Building',
  /**
   * An instance has been created.
   * @see {SingletonDefinition.instance}
   */
  Built = 'Built',
}

/**
 * Everything known about how to construct an {@code IMPL} concrete instance of a singleton.
 */
export interface SingletonDefinition<IMPL extends ManagedInstance> {
  ctor: Constructor<IMPL>;
  /**
   * We lazily construct instances, so this starts undefined.
   */
  instance?: IMPL;
  /**
   * Late-injected properties.
   */
  props: ManagedProperty<any>[];
  /**
   * Early-injected constructor parameters.
   */
  requires: ConstructorParam<any>[];
  /**
   * For cycle detection, track the lifecycle of this singleton.
   */
  state: ServiceState;
}

/**
 * Store constructor param metadata as a symbol on the constructor function itself.
 * @param target Concrete class constructor
 */
function getOrCreateConstructorParams<IMPL>(target: Constructor<IMPL>): ConstructorParam<any>[] {
  const params = target[constructorParamsKey] || [];
  if (target[constructorParamsKey] == null) {
    target[constructorParamsKey] = params;
  }
  return params;
}

/**
 * Store property injection metadata on the constructor.
 * @param target Concrete class constructor
 */
function getOrCreateProperties<IMPL>(target: Constructor<IMPL>): ManagedProperty<any>[] {
  const params = target[managedPropertiesKey] || [];
  if (target[managedPropertiesKey] == null) {
    target[managedPropertiesKey] = params;
  }
  return params;
}

/**
 * Try to create an instance of a singleton, resolving and injecting other values as necessary.
 * @param type Singleton definition
 * @throws {Error} If dependency cycles cannot be resolved, or if a required constructor param cannot be resolved.
 */
function construct<INTERFACE, IMPL extends INTERFACE & ManagedInstance>(type: SingletonDefinition<IMPL>): IMPL {
  if (type.instance != null) {
    return type.instance;
  }
  if (type.state === ServiceState.Building) {
    throw new Error(`Dependency cycle detected while trying to build ${type.ctor.name}`);
  }
  type.state = ServiceState.Building;
  const args = [];
  const required = type.requires;
  for (const param of required) {
    const interfaceType: InjectableType<INTERFACE> = <InjectableType<INTERFACE>>param.interfaceType;
    const arg = maybeOne(interfaceType);
    if (arg === undefined && !param.optional) {  // default false
      throw new Error(`Could not construct ${type.ctor.name} param ${interfaceType.name}`);
    }
    args.push(arg);
  }
  const instance = new type.ctor(...args);
  type.instance = instance;
  const props = type.props;
  for (const prop of props) {
    injectProperty(instance, prop);
  }
  if (typeof instance.postConstruct === 'function') {
    instance.postConstruct();
  }
  type.state = ServiceState.Built;
  return instance;
}

/**
 * Find or build an instance where exactly one provider is known.
 * @param type Interface type
 * @throws {Error} If zero or more than one implementations are available.
 */
function exactlyOne<INTERFACE>(type: InjectableType<INTERFACE>): INTERFACE {
  const one = maybeOne<INTERFACE>(type);
  if (one !== undefined) {
    return one;
  }
  throw new Error(`No implementations known for ${type.name}`);
}

/**
 * Find or build an instance.
 * @param type Interface type
 * @return {any} The instance if available, or undefined if not.
 * @throws {Error} If more than one implementation is available.
 */
function maybeOne<INTERFACE>(type: InjectableType<INTERFACE>): INTERFACE | undefined {
  if (type.implementations.length === 0) {
    return undefined;
  } else if (type.implementations.length > 1) {
    const implNames = type.implementations
      .map(i => i.ctor.name)
      .sort()
      .join(', ');
    throw new Error(`More than one implementation of ${type.name}: ${implNames}`);
  } else {
    return construct(type.implementations[0]);
  }
}

/**
 * Track the constructor parameter for later use.
 * @param isOptional True if the parameter may be undefined, false if a value is required
 * @param type Interface type
 * @param target Constructor for the concrete implementation
 * @param propertyKey Parameter name
 * @param parameterIndex Position of the parameter in the constructor method (0-based)
 */
function decorateParam<IMPL, PARAM>(
  isOptional: boolean,
  type: InterfaceType<PARAM>,
  target: Constructor<IMPL>,
  propertyKey: string | symbol,
  parameterIndex: number
): void {
  const params = getOrCreateConstructorParams<IMPL>(target);
  params.push({
    ctor: target,
    interfaceType: type,
    optional: isOptional,
    key: propertyKey,
    index: parameterIndex
  });
  params.sort((a, b) => a.index - b.index);
}

/**
 * Track the type property for later use.
 * @param type Interface type
 * @param target Constructor of the concrete class
 * @param propertyKey Property name
 */
function decorateProperty<IMPL, PROP>(
  type: InterfaceType<PROP>,
  target: Constructor<IMPL>,
  propertyKey: string | symbol,
): void {
  getOrCreateProperties<IMPL>(target).push({
    ctor: target,
    interfaceType: type,
    key: propertyKey,
  });
}

/**
 * For injected parameters, the property descriptor might exist up the prototype chain.
 * Recursively attempt to find the descriptor.
 * @param target Object (or ancestor)
 * @param key Property name
 * @return undefined if the property cannot be found in the object's ancestry
 */
function getPropertyDescriptor(target: any, key: string | symbol): PropertyDescriptor | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (descriptor != null) {
    return descriptor;
  }
  const proto = Object.getPrototypeOf(target);
  if (proto != null && proto !== Object && proto !== Object.prototype) {
    return getPropertyDescriptor(proto, key);
  }
}

/**
 * Some decorators do interesting things with property descriptors that we should try to play nicely with.
 * Set a value for the property (after resolving it), but do it gently.
 * @param target Object
 * @param prop Property definition
 */
function injectProperty<IMPL, PROP>(target: IMPL, prop: ManagedProperty<PROP>): void {
  const value = maybeOne(<InjectableType<PROP>>prop.interfaceType);
  if (value === undefined) {
    return;
  }
  const descriptor = getPropertyDescriptor(target, prop.key) || {};
  if (descriptor.set) {
    descriptor.set.call(target, value);
  } else {
    descriptor.value = value;
    Object.defineProperty(target, prop.key, descriptor);
  }
}

/**
 * Primary implementation of the type abstraction.
 */
class InjectableType<INTERFACE> implements TestableInterfaceType<INTERFACE> {

  /**
   * Private to force usage of {@link named} static builder.
   * @param name Interface name (why yes, it _would_ be nice if we could get this from the compiler)
   */
  private constructor(public readonly name: string) {
  }

  /**
   * @see {InterfaceType.inject}
   */
  public get inject(): PropertyDecorator {
    return <IMPL extends INTERFACE & ManagedInstance>(target: Object, propertyKey: string | symbol): void => {
      decorateProperty(this, <Constructor<IMPL>>(target.constructor), propertyKey);
    };
  }

  /**
   * @see {InterfaceType.optional}
   */
  public get optional(): ParameterDecorator {
    return <IMPL extends INTERFACE & ManagedInstance>(target: Object, propertyKey: string | symbol, parameterIndex: number): void => {
      decorateParam(true, this, <Constructor<IMPL>>target, propertyKey, parameterIndex);
    };
  }

  /**
   * @see {InterfaceType.provider}
   */
  public get provider(): ClassDecorator {
    return <IMPL extends INTERFACE & ManagedInstance>(target: Function): void => {
      const ctor = <Constructor<IMPL>>target;
      this.implementations.push({
        ctor: ctor,
        props: getOrCreateProperties<IMPL>(ctor),
        requires: getOrCreateConstructorParams<IMPL>(ctor),
        state: ServiceState.Defined,
      });
    };
  }

  /**
   * @see {InterfaceType.required}
   */
  public get required(): ParameterDecorator {
    return <IMPL extends INTERFACE & ManagedInstance>(target: Object, propertyKey: string | symbol, parameterIndex: number) => {
      const ctor = <Constructor<IMPL>>target;
      decorateParam(false, this, ctor, propertyKey, parameterIndex);
    };
  }

  /**
   * Cache of known interface types.
   * @see {named}
   */
  private static readonly types: { [key: string]: InjectableType<any> } = {};

  /**
   * Used by {@link provider} to track implementation constructors.
   */
  public readonly implementations: SingletonDefinition<INTERFACE>[] = [];

  /**
   * Try to ensure you get the same instance when asking for the same name.
   * @param name Type name
   */
  public static named<INTERFACE>(name: string): InjectableType<INTERFACE> {
    if (this.types[name] == null) {
      this.types[name] = new InjectableType<INTERFACE>(name);
    }
    return this.types[name];
  }

  /**
   * @see {InterfaceType.getInstance}
   */
  getInstance(): INTERFACE {
    return exactlyOne(this);
  }

  /**
   * @see {InterfaceType.getInstances}
   */
  getInstances(): INTERFACE[] {
    return this.implementations.map(def => construct(def));
  }

  /**
   * @see {TestableInterfaceType.resetCachedImplementations}
   */
  resetCachedImplementations(): void {
    this.implementations.forEach(impl => impl.instance = undefined);
  }
}

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
  return construct({
    ctor: type,
    props: getOrCreateProperties<IMPL>(type),
    requires: getOrCreateConstructorParams<IMPL>(type),
    state: ServiceState.Defined,
  });
}
