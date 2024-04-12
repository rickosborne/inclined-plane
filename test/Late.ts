import {Simple} from "./Simple";
import {testableType} from "../ts";
import {NoImpls} from "./NoImpls";

export interface Late {
    readonly noImpls: NoImpls | undefined;
    readonly simple: Simple | undefined;
}

export const Late = testableType<Late>("Late");
