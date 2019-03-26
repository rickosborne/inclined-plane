import {injectableType} from "../ts";
import {Simple} from "./Simple";

export interface Accessed {
  simple: Simple;
}

export const Accessed = injectableType<Accessed>('Accessed');

class AccessedImpl implements Accessed {
  constructor(public readonly simple: Simple) {
  }
}

// noinspection JSUnusedLocalSymbols
class AccessorImpl {
  constructor(
    @Simple.required private readonly simple: Simple,
  ) {
  }

  @Accessed.accessor
  access(): Accessed {
    return new AccessedImpl(this.simple);
  }
}

export const AccessorImplType = AccessorImpl;

