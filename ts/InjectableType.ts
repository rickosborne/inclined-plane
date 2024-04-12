import {AccessedDefinition} from "./AccessedDefinition";
import {ConstructedDefinition} from "./ConstructedDefinition";
import {
    AnyFunction,
    ClassMethodDecorator,
    Constructor,
    ConstructorParam,
    constructorParamsKey, Delayable,
    FunctionParam, InterfaceType,
    ManagedInstance,
    ManagedItem,
    managedPropertiesKey,
    ManagedProperty,
    Method,
    methodParamsKey,
    TestableInterfaceType,
} from "./decl";
import {ServiceState} from "./ServiceState";
import {SourceDefinition} from "./SourceDefinition";
import {SuppliedDefinition} from "./SuppliedDefinition";

export interface CoreActions {
    construct<INTERFACE, IMPL extends INTERFACE>(type: SourceDefinition<IMPL>): IMPL;
}

export interface InstanceResolver {
    many<INTERFACE>(type: InjectableType<INTERFACE>, actions: CoreActions): INTERFACE[];

    maybeOne<INTERFACE>(type: InjectableType<INTERFACE>, actions: CoreActions): INTERFACE | undefined;
}

// noinspection JSUnusedAssignment
export let InstanceResolverType: InjectableType<InstanceResolver> | null = null;
export let defaultInstanceResolver: InstanceResolver | null = null;

export function setDefaultInstanceResolver(resolver: InstanceResolver): void {
    defaultInstanceResolver = resolver;
    InstanceResolver.implementations.forEach(impl => {
        if (resolver instanceof impl.ctor) {
            impl.instance = resolver;
            impl.state = ServiceState.Built;
        }
    });
}

/**
 * Just a bunch of utility functions grouped to make automated code reorganization easier.
 */
export class Util {
    /**
   * Try to create an instance of a singleton, resolving and injecting other values as necessary.
   * @param type Singleton definition
   * @throws {Error} If dependency cycles cannot be resolved, or if a required constructor param cannot be resolved.
   */
    public static construct<INTERFACE, IMPL extends INTERFACE>(type: SourceDefinition<IMPL>): IMPL {
        if (type.instance != null) {
            return type.instance;
        }
        if (type.state === ServiceState.Building) {
            throw new Error(`Dependency cycle detected while trying to build ${type.name}`);
        }
        type.state = ServiceState.Building;
        const args = [];
        for (const param of type.getRequired()) {
            const arg = Util.maybeOne((param.interfaceType as InjectableType<unknown>));
            if (arg === undefined && !param.optional) {  // default false
                throw new Error(`Could not construct ${type.name} param ${(param.interfaceType as InjectableType<unknown>).name}`);
            }
            args.push(arg);
        }
        const instance = type.build(args);
        type.instance = instance;
        type.process(instance);
        type.state = ServiceState.Built;
        return instance;
    }

    /**
   * Find or build an instance where exactly one provider is known.
   * @param type Interface type
   * @throws {Error} If zero or more than one implementations are available.
   */
    public static exactlyOne<INTERFACE>(type: InjectableType<INTERFACE>): INTERFACE {
        const one = Util.maybeOne<INTERFACE>(type);
        if (one !== undefined) {
            return one;
        }
        throw new Error(`No implementations known for ${type.name}`);
    }

    /**
   * Store constructor param metadata as a symbol on the constructor function itself.
   * @param target Concrete class constructor
   */
    public static getOrCreateConstructorParams<IMPL>(target: Constructor<IMPL>): ConstructorParam<unknown>[] {
        return Util.getOrCreateOwn(target, constructorParamsKey, []);
    }

    /**
   * Store method parameter type metadata via a symbol on the method function itself.
   * @param method Function
   */
    public static getOrCreateMethodParams(method: Method<unknown>): FunctionParam<unknown>[] {
        return Util.getOrCreateOwn(method, methodParamsKey, []);
    }

    /**
   * Helper for finding a value on this instance only, creating it if it doesn't already exist.
   * @param target Instance
   * @param sym Key
   * @param defaultValue Default value
   * @param create Whether to save the value to the target
   */
    public static getOrCreateOwn<R>(target: object, sym: symbol, defaultValue: R, create: boolean = true): R {
        const descriptor = Object.getOwnPropertyDescriptor(target, sym);
        const val: R | undefined = Util.getValueFromDescriptor(descriptor, target) as R;
        if (val !== undefined) {
            return val;
        }
        if (create) {
            /* istanbul ignore next */
            if (descriptor && typeof descriptor.set === "function") {
                /* istanbul ignore next */
                descriptor.set.call(target, defaultValue);
            } else if (descriptor) {
                /* istanbul ignore next */
                descriptor.value = defaultValue;
            } else {
                Object.defineProperty(target, sym, {
                    value: defaultValue
                });
            }
        }
        return defaultValue;
    }

    /**
   * Store property injection metadata on the constructor.
   * @param target Concrete class constructor
   */
    public static getOrCreateProperties<IMPL>(target: Constructor<IMPL>): ManagedProperty<unknown>[] {
        return Util.getOrCreateOwn(target, managedPropertiesKey, []);
    }

    /**
   * Store property injection metadata on the constructor.
   * @param target Concrete class constructor
   */
    public static getProperties<IMPL>(target: Constructor<IMPL>): ManagedProperty<unknown>[] {
        const localProps: ManagedItem<unknown>[] = Util.getOrCreateOwn(target, managedPropertiesKey, [], false);
        const parentConstructor = Object.getPrototypeOf(target);
        if (parentConstructor === Function.prototype) {
            return localProps;
        }
        return localProps.concat(...Util.getProperties(parentConstructor));
    }

    /**
   * For injected parameters, the property descriptor might exist up the prototype chain.
   * Recursively attempt to find the descriptor.
   * @param target Object (or ancestor)
   * @param key Property name
   * @return undefined if the property cannot be found in the object's ancestry
   */
    public static getPropertyDescriptor(target: unknown, key: string | symbol): PropertyDescriptor | undefined {
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (descriptor != null) {
            return descriptor;
        }
        const proto = Object.getPrototypeOf(target);
        if (proto != null && proto !== Object && proto !== Object.prototype) {
            return Util.getPropertyDescriptor(proto, key);
        }
    }

    /**
   * Try to extract a value from a given target and descriptor.
   * @param descriptor Property descriptor
   * @param target Instance
   */
    public static getValueFromDescriptor(descriptor: PropertyDescriptor | undefined, target: object): unknown {
        if (descriptor != null) {
            if (descriptor.value !== undefined) {
                return descriptor.value;
            }
            /* istanbul ignore if */
            if (typeof descriptor.get === "function") {
                return descriptor.get.call(target);
            }
        }
    }

    /**
   * Some decorators do interesting things with property descriptors that we should try to play nicely with.
   * Set a value for the property (after resolving it), but do it gently.
   * @param target Object
   * @param prop Property definition
   */
    public static injectProperty<IMPL, PROP>(target: IMPL, prop: ManagedProperty<PROP>): void {
        const value = Util.maybeOne((prop.interfaceType as InjectableType<PROP>));
        if (value === undefined || prop.key == null) {
            return;
        }
        const descriptor = Util.getPropertyDescriptor(target, prop.key);
        if (descriptor === undefined) {
            Object.defineProperty(target, prop.key, {
                value: value,
            });
        } else if (descriptor.set) {
            descriptor.set.call(target, value);
        } else {
            descriptor.value = value;
            Object.defineProperty(target, prop.key, descriptor);
        }
    }

    public static many<INTERFACE>(type: InjectableType<INTERFACE>): INTERFACE[] {
    /* istanbul ignore if */
        if (defaultInstanceResolver == null) {
            throw new Error("Invalid configuration: no default instance resolver");
        }
        for (const resolver of defaultInstanceResolver.many(InstanceResolver, Util)) {
            const maybeInstances = resolver.many(type, Util);
            if (maybeInstances != null && maybeInstances.length > 0) {
                return maybeInstances;
            }
        }
        return [];
    }

    /**
   * Return zero or one instances of the specified type.
   * @param type Interface
   * @return undefined if there are no providers for the instance.
   * @throws {Error} If there are more than one source of a given type.
   */
    public static maybeOne<INTERFACE>(type: InjectableType<INTERFACE>): INTERFACE | undefined {
    /* istanbul ignore if */
        if (defaultInstanceResolver == null) {
            throw new Error("Invalid configuration: no default instance resolver");
        }
        for (const resolver of defaultInstanceResolver.many(InstanceResolver, Util)) {
            const maybeInstance = resolver.maybeOne(type, Util);
            if (maybeInstance != null) {
                return maybeInstance;
            }
        }
        return undefined;
    }
}

/**
 * Primary implementation of the type abstraction.
 */
export class InjectableType<INTERFACE> implements TestableInterfaceType<INTERFACE> {
    /**
     * Cache of known interface types.
     * @see {named}
     */
    private static readonly types: Record<string, InjectableType<unknown>> = {};

    /**
     * Try to ensure you get the same instance when asking for the same name.
     * @param name Type name
     */
    public static named<INTERFACE>(name: string): InjectableType<INTERFACE> {
        if (this.types[name] == null) {
            this.types[name] = new InjectableType<unknown>(name);
        }
        return this.types[name] as InjectableType<INTERFACE>;
    }

    /**
     * Used by {@link implementation} to track implementation constructors.
     */
    public readonly accessors: AccessedDefinition<INTERFACE, object>[] = [];
    public readonly implementations: ConstructedDefinition<INTERFACE>[] = [];
    public readonly suppliers: SuppliedDefinition<INTERFACE>[] = [];

    /**
     * Private to force usage of {@link named} static builder.
     * @param name Interface name (why yes, it _would_ be nice if we could get this from the compiler)
     */
    private constructor(public readonly name: string) {
    }

    /**
   * @see {InterfaceType.accessor}
   */
    public get accessor(): Delayable<ClassMethodDecorator<INTERFACE>> {
        const decorator = <IMPL extends INTERFACE & ManagedInstance, PROXY extends ManagedInstance>(
            delayed: boolean,
            target: { constructor: AnyFunction; name?: string },
            propertyKey: string | symbol,
            descriptor: TypedPropertyDescriptor<unknown>
        ): void => {
            if (target.constructor === Function) {  // static
                throw new Error(`Use .supplier instead of .accessor for static methods: ${target.name}.${propertyKey.toString()}`);
            }
            const ctor = target.constructor as unknown as Constructor<PROXY>;
            const method = descriptor.value as Method<IMPL>;
            this.accessors.push(new AccessedDefinition<IMPL, PROXY>(ctor, method, propertyKey, delayed));
        };
        return Object.assign(decorator.bind(this, false), {
            get delayed(): ClassMethodDecorator<INTERFACE> {
                return decorator.bind(this, true) as ClassMethodDecorator<INTERFACE>;
            }
        }) as Delayable<ClassMethodDecorator<INTERFACE>>;
    }

    /**
   * @see {InterfaceType.implementation}
   */
    public get implementation(): Delayable<ClassDecorator> {
        const decorator = <IMPL extends INTERFACE & ManagedInstance>(delayed: boolean, target: AnyFunction): void => {
            const ctor = target as unknown as Constructor<IMPL>;
            this.implementations.push(new ConstructedDefinition<INTERFACE>(ctor, delayed));
        };
        return Object.assign(decorator.bind(this, false), {
            get delayed(): ClassDecorator {
                return decorator.bind(this, true) as ClassDecorator;
            }
        }) as Delayable<ClassDecorator>;
    }

    /**
   * @see {InterfaceType.inject}
   */
    public get inject(): PropertyDecorator {
        return <IMPL extends INTERFACE & ManagedInstance>(target: object, propertyKey: string | symbol): void => {
            this.trackProperty((target.constructor as Constructor<IMPL>), propertyKey);
        };
    }

    /**
   * @see {InterfaceType.optional}
   */
    public get optional(): ParameterDecorator {
        return this.paramDecorator(true);
    }

    /**
   * @see {InterfaceType.required}
   */
    public get required(): ParameterDecorator {
        return this.paramDecorator(false);
    }

    /**
   * Helper for debugging sources for this type.
   */
    public get sourceNames(): string[] {
        return this.sources.map(source => source.name);
    }

    public get sources(): SourceDefinition<INTERFACE>[] {
        return ([] as SourceDefinition<INTERFACE>[])
            .concat(this.accessors)
            .concat(this.implementations)
            .concat(this.suppliers)
        ;
    }

    /**
   * @see {InterfaceType.supplier}
   */
    public get supplier(): Delayable<MethodDecorator> {
        const decorator = (
            delayed: boolean,
            target: object,
            propertyKey: string | symbol,
            descriptor: TypedPropertyDescriptor<unknown>
        ): void => {
            const method = descriptor.value as Method<INTERFACE>;
            const ctor = target as Constructor<unknown>;
            this.suppliers.push(new SuppliedDefinition<INTERFACE>(method, ctor, propertyKey, delayed));
        };
        return Object.assign(decorator.bind(this, false), {
            get delayed(): MethodDecorator {
                return decorator.bind(this, true) as MethodDecorator;
            }
        }) as Delayable<MethodDecorator>;
    }

    /**
   * @see {InterfaceType.getInstance}
   */
    getInstance(): INTERFACE {
        return Util.exactlyOne(this);
    }

    /**
   * @see {InterfaceType.getInstances}
   */
    getInstances(): INTERFACE[] {
        return Util.many(this);
    }

    /**
   * Abstraction for decorator generators.
   * @param isOptional Whether the resulting param is marked as optional
   */
    private paramDecorator(isOptional: boolean): ParameterDecorator {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        return function decorateParam<IMPL extends INTERFACE & ManagedInstance>(
            target: object,
            propertyKey: string | symbol | undefined,
            parameterIndex: number
        ) {
            const descriptor = propertyKey != null ? Object.getOwnPropertyDescriptor(target, propertyKey) : undefined;
            if (propertyKey != null && descriptor != null && typeof descriptor.value === "function") {
                const method = descriptor.value as Method<INTERFACE>;
                if (method.name == null || method.name === "") {
                    Object.defineProperty(method, "name", {value: propertyKey});
                }
                that.trackMethodParam(isOptional, propertyKey, parameterIndex, method);
            } else {
                that.trackConstructorParam(isOptional, (target as Constructor<IMPL>), propertyKey, parameterIndex);
            }
        };
    }

    /**
     * @see {TestableInterfaceType.resetCachedImplementations}
     */
    public resetCachedImplementations(): void {
        this.implementations.forEach(impl => {
            impl.instance = undefined;
            impl.state = ServiceState.Defined;
        });
    }

    /**
   * Track the constructor parameter for later use.
   * @param isOptional True if the parameter may be undefined, false if a value is required
   * @param ctor Constructor for the concrete implementation
   * @param propertyKey Parameter name
   * @param parameterIndex Position of the parameter in the constructor method (0-based)
   */
    private trackConstructorParam<IMPL>(
        isOptional: boolean,
        ctor: Constructor<IMPL>,
        propertyKey: string | symbol | undefined,
        parameterIndex: number
    ): void {
        const params = Util.getOrCreateConstructorParams<IMPL>(ctor);
        params.push({
            ctor: ctor,
            interfaceType: this as InterfaceType<unknown>,
            optional: isOptional,
            key: propertyKey,
            index: parameterIndex
        });
        params.sort((a, b) => a.index - b.index);
    }

    /**
   * Like {@link trackConstructorParam} but for other methods
   * @param isOptional Whether the param is optional
   * @param propertyKey Name
   * @param parameterIndex Order
   * @param method Function
   */
    private trackMethodParam(
        isOptional: boolean,
        propertyKey: string | symbol,
        parameterIndex: number,
        method: Method<INTERFACE>
    ) {
        const params = Util.getOrCreateMethodParams(method);
        params.push({
            interfaceType: this as InterfaceType<unknown>,
            optional: isOptional,
            key: propertyKey,
            index: parameterIndex,
        });
        params.sort((a, b) => a.index - b.index);
    }

    /**
   * Track the type property for later use.
   * @param target Constructor of the concrete class
   * @param propertyKey Property name
   */
    private trackProperty<IMPL>(
        target: Constructor<IMPL>,
        propertyKey: string | symbol,
    ): void {
        Util.getOrCreateProperties<IMPL>(target).push({
            ctor: target,
            interfaceType: this as InterfaceType<unknown>,
            key: propertyKey,
            optional: true,
        });
    }
}

InstanceResolverType = InjectableType.named<InstanceResolver>("InstanceResolver");
export const InstanceResolver = InstanceResolverType;
import "./DefaultInstanceResolver";
