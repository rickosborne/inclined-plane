import {ManyImpl} from "./ManyImpl";
import {Simple} from "./Simple";

@ManyImpl.provider
class ManyOne implements ManyImpl {

}

export const ManyOneType = ManyOne;

@ManyImpl.provider
class ManyTwo implements ManyImpl {
  constructor(
    @Simple.required public readonly simple: Simple
  ) {}
}

export const ManyTwoType = ManyTwo;
