import {Simple} from "./Simple";
import {testableType} from "../ts";
import {NoImpls} from "./NoImpls";

export interface Late {
  readonly simple: Simple | undefined;
  readonly noImpls: NoImpls | undefined;
}

export const Late = testableType<Late>('Late');
