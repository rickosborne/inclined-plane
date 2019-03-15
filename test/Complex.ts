import {NoImpls} from "./NoImpls";
import {Simple} from "./Simple";
import {testableType} from "../ts";

export interface Complex {
  noImpls?: NoImpls;
  simple: Simple;
}

export const Complex = testableType<Complex>('Complex');
