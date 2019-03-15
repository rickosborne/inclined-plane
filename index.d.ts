export declare const constructorParamsKey: unique symbol;
export interface ManagedInstance {
    postConstruct?(): void;
}
export interface Constructor<IMPL extends ManagedInstance> {
    readonly name: string;
    [constructorParamsKey]?: ConstructorParam<any>[];
    new (...args: any[]): IMPL;
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
    optional: boolean;
}
export interface ServiceDefinition<IMPL extends ManagedInstance> {
    ctor: Constructor<IMPL>;
    instance?: IMPL;
    requires: ConstructorParam<any>[];
}
export declare function injectableType<INTERFACE>(interfaceName: string): InterfaceType<INTERFACE>;
export declare function buildInstance<IMPL>(type: Constructor<IMPL>): IMPL;
