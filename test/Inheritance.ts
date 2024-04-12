import {Simple} from "./Simple";
import {testableType} from "../ts";

export interface Inheritance {
    readonly simple: Simple | undefined | null;
}

export const Inheritance = testableType<Inheritance>("Inheritance");

abstract class InheritanceBase implements Inheritance {
    @Simple.inject public readonly simple: Simple | undefined | null = null;
}

export class InheritanceImpl extends InheritanceBase {}
