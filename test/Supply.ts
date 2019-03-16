import {Simple} from "./Simple";
import {testableType} from "../ts";

export interface Supply {
  simple: Simple;
}

export const Supply = testableType<Supply>('Supply');

class Supplied implements Supply {
  @Supply.supplier
  public static buildSupply(
    @Simple.required simple: Simple
  ): Supply {
    return new Supplied(simple);
  }

  private constructor(public readonly simple: Simple) {
  }
}

export const SupplyImplType = Supplied;
