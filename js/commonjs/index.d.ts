/**
 * Property key for constructors to track their params.
 * @see {ConstructorParam}
 */
export declare const constructorParamsKey: unique symbol;
/**
 * Property key for constructors to track properties on their prototypes.
 * We put them on the constructor instead of the prototype just to make debugging a bit easier.
 * @see {ManagedProperty}
 */
export declare const managedPropertiesKey: unique symbol;
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
    new (...args: any[]): IMPL;
}
/**
 * This is an upgraded {@link ClassDecorator} that will prevent adding {@link InterfaceType.provider} to the wrong type.
 */
export declare type TypedClassDecorator<IMPL> = (target: Constructor<IMPL>) => void;
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
    provider: TypedClassDecorator<INTERFACE>;
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
export declare type ManagedProperty<PROP> = ManagedItem<PROP>;
/**
 * Constructor params have a specific ordering.
 */
export interface ConstructorParam<PARAM> extends ManagedItem<PARAM> {
    index: number;
    optional: boolean;
}
/**
 * To detect cycles we keep track of types that are currently in the middle of the building process.
 */
declare enum ServiceState {
    /**
     * No instances created yet.
     */
    Defined = "Defined",
    /**
     * Instance creation has started but has not completed.
     */
    Building = "Building",
    /**
     * An instance has been created.
     * @see {SingletonDefinition.instance}
     */
    Built = "Built"
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
 * Find or generate a managed type definition for the given named interface.
 * @param interfaceName Name of the interface.
 */
export declare function injectableType<INTERFACE>(interfaceName: string): InterfaceType<INTERFACE>;
/**
 * Find or generate a managed type definition for the given named interface with additional functionality appropriate for unit testing.
 * @param interfaceName Name of the interface.
 */
export declare function testableType<INTERFACE>(interfaceName: string): TestableInterfaceType<INTERFACE>;
/**
 * Build an instance of the given concrete constructor, injecting parameters and properties as necessary.
 * @param type Concrete constructor
 */
export declare function buildInstance<IMPL>(type: Constructor<IMPL>): IMPL;
export {};
