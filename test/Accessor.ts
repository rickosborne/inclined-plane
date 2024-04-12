import {injectableType} from "../ts";
import {ManagedInstance} from "../ts/decl";
import {Simple} from "./Simple";

export interface Accessed {
    simple: Simple;
}

export const Accessed = injectableType<Accessed>("Accessed");

class AccessedImpl implements Accessed, ManagedInstance {
    public postConstructWasCalled = false;

    constructor(public readonly simple: Simple) {
    }

    public postConstruct(): void {
        this.postConstructWasCalled = true;
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


export const AccessedImplType = AccessedImpl;
