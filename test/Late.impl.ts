import {Late} from "./Late";
import {Simple} from "./Simple";
import {NoImpls} from "./NoImpls";

@Late.provider
class LateProvider implements Late {
  @Simple.inject public readonly simple: Simple | undefined;
  @NoImpls.inject public readonly noImpls: NoImpls | undefined;
}

export class LateBuilt implements Late {
  @Simple.inject public readonly simple: Simple | undefined;
  @NoImpls.inject public readonly noImpls: NoImpls | undefined;
}

const privateKey = Symbol('sneaky');

function meddlingDecorator(target: Object, propertyKey: string | symbol): void {
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
  @Simple.inject @meddlingDecorator public readonly simple: Simple | undefined;
  @NoImpls.inject public readonly noImpls: NoImpls | undefined;
}

export const LateProviderType = LateProvider;
