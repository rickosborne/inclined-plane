import {Late} from "./Late";
import {Simple} from "./Simple";
import {NoImpls} from "./NoImpls";

@Late.implementation
class LateProvider implements Late {
    @NoImpls.inject public readonly noImpls: NoImpls | undefined;
    @Simple.inject public readonly simple: Simple | undefined;
}

export class LateBuilt implements Late {
    @NoImpls.inject public readonly noImpls: NoImpls | undefined;
    @Simple.inject public readonly simple: Simple | undefined;
}

const privateKey = Symbol("sneaky");

function meddlingDecorator(target: object, propertyKey: string | symbol): void {
    Object.defineProperty(target, propertyKey, {
        enumerable: false,
        configurable: false,
        get(): Simple {
            return this[privateKey];
        },
        set(v: Simple) {
            this[privateKey] = v;
        }
    });
}

export class LateComplicated implements Late {
    @NoImpls.inject public readonly noImpls: NoImpls | undefined;
    @Simple.inject @meddlingDecorator public readonly simple: Simple | undefined;
}

export const LateProviderType = LateProvider;
