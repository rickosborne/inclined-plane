import {ManyImpl} from "./ManyImpl";
import {Simple} from "./Simple";

@ManyImpl.implementation.delayed
class ManyOne implements ManyImpl {

}

export const ManyOneType = ManyOne;

@ManyImpl.implementation
class ManyTwo implements ManyImpl {
    constructor(
        @Simple.required public readonly simple: Simple
    ) {}
}

export const ManyTwoType = ManyTwo;
