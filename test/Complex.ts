import {NoImpls} from "./NoImpls";
import {Simple} from "./Simple";
import {injectableType} from "../ts";

export interface Complex {
  noImpls?: NoImpls;
  simple: Simple;
}

export const Complex = injectableType<Complex>('Complex')
