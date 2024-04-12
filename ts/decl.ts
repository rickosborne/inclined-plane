/**
 * Mixin to support a callback after an instance's properties have all been injected.
 */
export interface ManagedInstance {
    postConstruct?(): void;
}

export type AnyFunction = (...args: unknown[]) => unknown;

export const isManagedInstance = (impl: unknown): impl is ManagedInstance =>
    impl != null &&
    impl instanceof Object &&
    "postConstruct" in impl &&
    typeof impl.postConstruct === "function";

/**
 * Property key for constructors to track their params.
 * @see {ConstructorParam}
 */
export const constructorParamsKey = Symbol("inclined-plane:constructorParams");
/**
 * Property key for constructors to track properties on their prototypes.
 * We put them on the constructor instead of the prototype just to make debugging a bit easier.
 * @see {ManagedProperty}
 */
export const managedPropertiesKey = Symbol("inclined-plane:managedProperties");
/**
 * Property key for (likely static) methods to track their params.
 * @see {FunctionParam}
 */
export const methodParamsKey = Symbol("inclined-plane:methodParams");

/**
 * Since {@code Function} is so limited, this is our version that accounts for the additional metadata.
 * The {@code IMPL} type is a concrete implementation class, versus an interface.
 */
export interface Constructor<IMPL> {
    [constructorParamsKey]?: ConstructorParam<unknown>[] | undefined;
    [managedPropertiesKey]?: ManagedProperty<unknown>[] | undefined;
    readonly name: string;

    new(...args: never[]): IMPL;
}

/**
 * A method (likely static) that can also be tagged with metadata.
 */
export type Method<INTERFACE> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((...args: any[]) => INTERFACE)
  & { [methodParamsKey]?: FunctionParam<unknown>[] }
  // eslint-disable-next-line @typescript-eslint/ban-types
  & Function;

/**
 * This is an upgraded {@link ClassDecorator} that will prevent adding {@link InterfaceType.implementation} to the wrong type.
 */
export type TypedClassDecorator<IMPL> = (target: Constructor<IMPL>) => void;

/**
 * This is an upgraded {@link MethodDecorator} that prevents easy copy-paste type issues for {@link InterfaceType.supplier}.
 */
export type TypedMethodDecorator<RETURN>
// eslint-disable-next-line @typescript-eslint/ban-types
  = (target: Function, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<Method<RETURN>>) => void;

export type ClassMethodDecorator<RETURN>
// eslint-disable-next-line @typescript-eslint/ban-types
  = (target: {constructor: Function}, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<Method<RETURN>>) => void;

// Currently, TS definitions for instance method decorators don't seem to make this possible.
// export type InstanceMethodDecorator<IMPL, RETURN>
//   = (target: {constructor: Constructor<IMPL>},
//   propertyKey: string | symbol,
//   descriptor: TypedPropertyDescriptor<Method<RETURN>>
//   ) => void;

/**
 * Some decorators can mark an implementation as delayed, meaning low priority or default.
 * Typically, this is used with Instance Resolvers.
 */
export type Delayable<T> = T & { delayed: T };

/**
 * The primary interaction type for most use-cases.
 * The {@code INTERFACE} type is an interface, versus a concrete class.
 * @see {injectableType}
 */
export interface InterfaceType<INTERFACE> {
    /**
     * Decorate an instance method as a source for this type.
     */
    readonly accessor: Delayable<ClassMethodDecorator<INTERFACE>>;
    /**
     * Decorate a class as a concrete implementation of this type.
     */
    readonly implementation: Delayable<TypedClassDecorator<INTERFACE>>;
    /**
     * Decorate a property as an injection target with this type.
     */
    readonly inject: PropertyDecorator;
    /**
     * Simple name of the type.  May not be unique!
     */
    readonly name: string;
    /**
     * Decorate a constructor parameter as an injection target with this type.
     * When building an instance, the value will be set to undefined if it cannot be found.
     */
    readonly optional: ParameterDecorator;
    /**
     * Decorate a constructor parameter as an injection target with this type.
     * When building an instance, an error will be thrown if a value cannot be found.
     */
    readonly required: ParameterDecorator;
    /**
     * Decorate a (static) method as a source for this type.
     */
    readonly supplier: Delayable<TypedMethodDecorator<INTERFACE>>;

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
 * Base type for parameters and properties that have specific types.
 */
export interface TypedItem<T> {
    interfaceType: InterfaceType<T>;
    key: string | symbol | undefined;
    optional: boolean;  // default false
}

/**
 * Base type for an item that is injected.
 */
export interface ManagedItem<T> extends TypedItem<T> {
    ctor: Constructor<T>;
}

/**
 * For now, properties don't have anything extra interesting.
 */
export type ManagedProperty<PROP> = ManagedItem<PROP>;

/**
 * Constructor params have a specific ordering.
 */
export interface FunctionParam<PARAM> extends TypedItem<PARAM> {
    index: number;
}

/**
 * Constructor params have a specific ordering.
 */
export interface ConstructorParam<PARAM> extends ManagedItem<PARAM>, FunctionParam<PARAM> {
}
