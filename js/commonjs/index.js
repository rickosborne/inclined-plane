"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Property key for constructors to track their params.
 * @see {ConstructorParam}
 */
exports.constructorParamsKey = Symbol('inclined-plane:constructorParams');
/**
 * Property key for constructors to track properties on their prototypes.
 * We put them on the constructor instead of the prototype just to make debugging a bit easier.
 * @see {ManagedProperty}
 */
exports.managedPropertiesKey = Symbol('inclined-plane:managedProperties');
/**
 * To detect cycles we keep track of types that are currently in the middle of the building process.
 */
var ServiceState;
(function (ServiceState) {
    /**
     * No instances created yet.
     */
    ServiceState["Defined"] = "Defined";
    /**
     * Instance creation has started but has not completed.
     */
    ServiceState["Building"] = "Building";
    /**
     * An instance has been created.
     * @see {SingletonDefinition.instance}
     */
    ServiceState["Built"] = "Built";
})(ServiceState || (ServiceState = {}));
/**
 * Store constructor param metadata as a symbol on the constructor function itself.
 * @param target Concrete class constructor
 */
function getOrCreateConstructorParams(target) {
    var params = target.hasOwnProperty(exports.constructorParamsKey) ? target[exports.constructorParamsKey] || [] : [];
    if (target[exports.constructorParamsKey] == null) {
        target[exports.constructorParamsKey] = params;
    }
    return params;
}
/**
 * Store property injection metadata on the constructor.
 * @param target Concrete class constructor
 */
function getProperties(target) {
    var localProps = target.hasOwnProperty(exports.managedPropertiesKey) ? target[exports.managedPropertiesKey] || [] : [];
    if (target[exports.managedPropertiesKey] == null) {
        target[exports.managedPropertiesKey] = localProps;
    }
    var parentConstructor = Object.getPrototypeOf(target);
    if (parentConstructor === Function.prototype) {
        return localProps;
    }
    return localProps.concat.apply(localProps, getProperties(parentConstructor));
}
/**
 * Store property injection metadata on the constructor.
 * @param target Concrete class constructor
 */
function getOrCreateProperties(target) {
    var params = target[exports.managedPropertiesKey] || [];
    if (target[exports.managedPropertiesKey] == null) {
        target[exports.managedPropertiesKey] = params;
    }
    return params;
}
/**
 * Try to create an instance of a singleton, resolving and injecting other values as necessary.
 * @param type Singleton definition
 * @throws {Error} If dependency cycles cannot be resolved, or if a required constructor param cannot be resolved.
 */
function construct(type) {
    var _a;
    if (type.instance != null) {
        return type.instance;
    }
    if (type.state === ServiceState.Building) {
        throw new Error("Dependency cycle detected while trying to build " + type.ctor.name);
    }
    type.state = ServiceState.Building;
    var args = [];
    var required = type.requires;
    for (var _i = 0, required_1 = required; _i < required_1.length; _i++) {
        var param = required_1[_i];
        var interfaceType = param.interfaceType;
        var arg = maybeOne(interfaceType);
        if (arg === undefined && !param.optional) { // default false
            throw new Error("Could not construct " + type.ctor.name + " param " + interfaceType.name);
        }
        args.push(arg);
    }
    var instance = new ((_a = type.ctor).bind.apply(_a, [void 0].concat(args)))();
    type.instance = instance;
    var props = type.props;
    for (var _b = 0, props_1 = props; _b < props_1.length; _b++) {
        var prop = props_1[_b];
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
function exactlyOne(type) {
    var one = maybeOne(type);
    if (one !== undefined) {
        return one;
    }
    throw new Error("No implementations known for " + type.name);
}
/**
 * Find or build an instance.
 * @param type Interface type
 * @return {any} The instance if available, or undefined if not.
 * @throws {Error} If more than one implementation is available.
 */
function maybeOne(type) {
    if (type.implementations.length === 0) {
        return undefined;
    }
    else if (type.implementations.length > 1) {
        var implNames = type.implementations
            .map(function (i) { return i.ctor.name; })
            .sort()
            .join(', ');
        throw new Error("More than one implementation of " + type.name + ": " + implNames);
    }
    else {
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
function decorateParam(isOptional, type, target, propertyKey, parameterIndex) {
    var params = getOrCreateConstructorParams(target);
    params.push({
        ctor: target,
        interfaceType: type,
        optional: isOptional,
        key: propertyKey,
        index: parameterIndex
    });
    params.sort(function (a, b) { return a.index - b.index; });
}
/**
 * Track the type property for later use.
 * @param type Interface type
 * @param target Constructor of the concrete class
 * @param propertyKey Property name
 */
function decorateProperty(type, target, propertyKey) {
    getOrCreateProperties(target).push({
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
function getPropertyDescriptor(target, key) {
    var descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor != null) {
        return descriptor;
    }
    var proto = Object.getPrototypeOf(target);
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
function injectProperty(target, prop) {
    var value = maybeOne(prop.interfaceType);
    if (value === undefined) {
        return;
    }
    var descriptor = getPropertyDescriptor(target, prop.key);
    if (descriptor === undefined) {
        Object.defineProperty(target, prop.key, {
            value: value,
        });
    }
    else if (descriptor.set) {
        descriptor.set.call(target, value);
    }
    else {
        descriptor.value = value;
        Object.defineProperty(target, prop.key, descriptor);
    }
}
/**
 * Primary implementation of the type abstraction.
 */
var InjectableType = /** @class */ (function () {
    /**
     * Private to force usage of {@link named} static builder.
     * @param name Interface name (why yes, it _would_ be nice if we could get this from the compiler)
     */
    function InjectableType(name) {
        this.name = name;
        /**
         * Used by {@link provider} to track implementation constructors.
         */
        this.implementations = [];
    }
    Object.defineProperty(InjectableType.prototype, "inject", {
        /**
         * @see {InterfaceType.inject}
         */
        get: function () {
            var _this = this;
            return function (target, propertyKey) {
                decorateProperty(_this, (target.constructor), propertyKey);
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InjectableType.prototype, "optional", {
        /**
         * @see {InterfaceType.optional}
         */
        get: function () {
            var _this = this;
            return function (target, propertyKey, parameterIndex) {
                decorateParam(true, _this, target, propertyKey, parameterIndex);
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InjectableType.prototype, "provider", {
        /**
         * @see {InterfaceType.provider}
         */
        get: function () {
            var _this = this;
            return function (target) {
                var ctor = target;
                _this.implementations.push({
                    ctor: ctor,
                    props: getProperties(ctor),
                    requires: getOrCreateConstructorParams(ctor),
                    state: ServiceState.Defined,
                });
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InjectableType.prototype, "required", {
        /**
         * @see {InterfaceType.required}
         */
        get: function () {
            var _this = this;
            return function (target, propertyKey, parameterIndex) {
                var ctor = target;
                decorateParam(false, _this, ctor, propertyKey, parameterIndex);
            };
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Try to ensure you get the same instance when asking for the same name.
     * @param name Type name
     */
    InjectableType.named = function (name) {
        if (this.types[name] == null) {
            this.types[name] = new InjectableType(name);
        }
        return this.types[name];
    };
    /**
     * @see {InterfaceType.getInstance}
     */
    InjectableType.prototype.getInstance = function () {
        return exactlyOne(this);
    };
    /**
     * @see {InterfaceType.getInstances}
     */
    InjectableType.prototype.getInstances = function () {
        return this.implementations.map(function (def) { return construct(def); });
    };
    /**
     * @see {TestableInterfaceType.resetCachedImplementations}
     */
    InjectableType.prototype.resetCachedImplementations = function () {
        this.implementations.forEach(function (impl) {
            impl.instance = undefined;
            impl.state = ServiceState.Defined;
        });
    };
    /**
     * Cache of known interface types.
     * @see {named}
     */
    InjectableType.types = {};
    return InjectableType;
}());
/**
 * Find or generate a managed type definition for the given named interface.
 * @param interfaceName Name of the interface.
 */
function injectableType(interfaceName) {
    return InjectableType.named(interfaceName);
}
exports.injectableType = injectableType;
/**
 * Find or generate a managed type definition for the given named interface with additional functionality appropriate for unit testing.
 * @param interfaceName Name of the interface.
 */
function testableType(interfaceName) {
    return InjectableType.named(interfaceName);
}
exports.testableType = testableType;
/**
 * Build an instance of the given concrete constructor, injecting parameters and properties as necessary.
 * @param type Concrete constructor
 */
function buildInstance(type) {
    return construct({
        ctor: type,
        props: getProperties(type),
        requires: getOrCreateConstructorParams(type),
        state: ServiceState.Defined,
    });
}
exports.buildInstance = buildInstance;
//# sourceMappingURL=index.js.map