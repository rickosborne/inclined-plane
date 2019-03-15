export const constructorParamsKey = Symbol('inclined-plane:constructorParams');

export interface ManagedInstance {
  postConstruct?(): void;
}

export interface Constructor<IMPL extends ManagedInstance> {
  readonly name: string;
  [constructorParamsKey]?: ConstructorParam<any>[];

  new(...args: any[]): IMPL;
}

export interface InterfaceType<INTERFACE> {
  implementations: ServiceDefinition<INTERFACE>[];
  name: string;
  optional: ParameterDecorator;
  provider: ClassDecorator;
  required: ParameterDecorator;

  getInstance(): INTERFACE;
  getInstances(): INTERFACE[];

  resetCachedImplementations(): void;
}

export interface ConstructorParam<PARAM> {
  ctor: Constructor<PARAM>;
  index: number;
  interfaceType: InterfaceType<PARAM>;
  key: string | symbol;
  optional: boolean;  // default false
}

export interface ServiceDefinition<IMPL extends ManagedInstance> {
  ctor: Constructor<IMPL>;
  instance?: IMPL;
  requires: ConstructorParam<any>[];
}

/**
 * We store constructor param metadata as a symbol on the constructor function itself.
 * @param target Class
 */
function getOrCreateConstructorParams<IMPL>(target: Constructor<IMPL>): ConstructorParam<any>[] {
  const params = target[constructorParamsKey] || [];
  if (target[constructorParamsKey] == null) {
    target[constructorParamsKey] = params;
  }
  return params;
}

function construct<INTERFACE, IMPL extends INTERFACE & ManagedInstance>(type: ServiceDefinition<IMPL>): IMPL {
  if (type.instance != null) {
    return type.instance;
  }
  const args = [];
  const required = type.requires || [];
  for (const param of required) {
    const interfaceType = param.interfaceType;
    const arg = maybeOne(interfaceType);
    if (arg === undefined && !param.optional) {  // default false
      throw new Error(`Could not construct ${type.ctor.name} param ${interfaceType.name}`);
    }
    args.push(arg);
  }
  const instance = new type.ctor(...args);
  if (typeof instance.postConstruct === 'function') {
    instance.postConstruct();
  }
  type.instance = instance;
  return instance;
}

function exactlyOne<INTERFACE>(type: InterfaceType<INTERFACE>): INTERFACE {
  const one = maybeOne<INTERFACE>(type);
  if (one !== undefined) {
    return one;
  }
  throw new Error(`No implementations known for ${type.name}`);
}

function maybeOne<INTERFACE>(type: InterfaceType<INTERFACE>): INTERFACE | undefined {
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

class InjectableType<INTERFACE> implements InterfaceType<INTERFACE> {

  private constructor(public readonly name: string) {
  }

  public get optional(): ParameterDecorator {
    return <IMPL extends INTERFACE & ManagedInstance>(target: Object, propertyKey: string | symbol, parameterIndex: number): void => {
      decorateParam(true, this, <Constructor<IMPL>>target, propertyKey, parameterIndex);
    };
  }

  public get provider(): ClassDecorator {
    return <IMPL extends INTERFACE & ManagedInstance>(target: Function): void => {
      const ctor = <Constructor<IMPL>>target;
      this.implementations.push({
        ctor: ctor,
        requires: getOrCreateConstructorParams<IMPL>(ctor),
      });
    };
  }

  public get required(): ParameterDecorator {
    return <IMPL extends INTERFACE & ManagedInstance>(target: Object, propertyKey: string | symbol, parameterIndex: number) => {
      const ctor = <Constructor<IMPL>>target;
      decorateParam(false, this, ctor, propertyKey, parameterIndex);
    };
  }

  private static readonly types: { [key: string]: InjectableType<any> } = {};

  public readonly implementations: ServiceDefinition<INTERFACE>[] = [];

  public static named<INTERFACE>(name: string): InjectableType<INTERFACE> {
    if (this.types[name] == null) {
      this.types[name] = new InjectableType<INTERFACE>(name);
    }
    return this.types[name];
  }

  getInstance(): INTERFACE {
    return exactlyOne(this);
  }

  getInstances(): INTERFACE[] {
    return this.implementations.map(def => construct(def));
  }

  resetCachedImplementations(): void {
    this.implementations.forEach(impl => impl.instance = undefined);
  }
}

export function injectableType<INTERFACE>(interfaceName: string): InterfaceType<INTERFACE> {
  return InjectableType.named<INTERFACE>(interfaceName);
}

export function buildInstance<IMPL>(type: Constructor<IMPL>): IMPL {
  return construct({
    ctor: type,
    requires: getOrCreateConstructorParams(type),
  });
}
