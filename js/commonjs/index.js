"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructorParamsKey = Symbol('inclined-plane:constructorParams');
/**
 * We store constructor param metadata as a symbol on the constructor function itself.
 * @param target Class
 */
function getOrCreateConstructorParams(target) {
    var params = target[exports.constructorParamsKey] || [];
    if (target[exports.constructorParamsKey] == null) {
        target[exports.constructorParamsKey] = params;
    }
    return params;
}
function construct(type) {
    var _a;
    if (type.instance != null) {
        return type.instance;
    }
    var args = [];
    var required = type.requires || [];
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
    if (typeof instance.postConstruct === 'function') {
        instance.postConstruct();
    }
    type.instance = instance;
    return instance;
}
function exactlyOne(type) {
    var one = maybeOne(type);
    if (one !== undefined) {
        return one;
    }
    throw new Error("No implementations known for " + type.name);
}
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
var InjectableType = /** @class */ (function () {
    function InjectableType(name) {
        this.name = name;
        this.implementations = [];
    }
    Object.defineProperty(InjectableType.prototype, "optional", {
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
        get: function () {
            var _this = this;
            return function (target) {
                var ctor = target;
                _this.implementations.push({
                    ctor: ctor,
                    requires: getOrCreateConstructorParams(ctor),
                });
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InjectableType.prototype, "required", {
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
    InjectableType.named = function (name) {
        if (this.types[name] == null) {
            this.types[name] = new InjectableType(name);
        }
        return this.types[name];
    };
    InjectableType.prototype.getInstance = function () {
        return exactlyOne(this);
    };
    InjectableType.prototype.getInstances = function () {
        return this.implementations.map(function (def) { return construct(def); });
    };
    InjectableType.prototype.resetCachedImplementations = function () {
        this.implementations.forEach(function (impl) { return impl.instance = undefined; });
    };
    InjectableType.types = {};
    return InjectableType;
}());
function injectableType(interfaceName) {
    return InjectableType.named(interfaceName);
}
exports.injectableType = injectableType;
function buildInstance(type) {
    return construct({
        ctor: type,
        requires: getOrCreateConstructorParams(type),
    });
}
exports.buildInstance = buildInstance;
//# sourceMappingURL=index.js.map