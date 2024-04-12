import {describe} from "mocha";
import {Simple} from "./Simple";
import {NoImpls} from "./NoImpls";
import {Complex} from "./Complex";

@Complex.implementation
class ComplexImpl implements Complex {
    constructor(
        @Simple.required public readonly simple: Simple,
        @NoImpls.optional public readonly noImpls?: NoImpls
    ) {
    }
}

/**
 * Exposed for testing.
 * Generally you don't want to export your implementations
 * because you _should_ be coding to the interface.
 */
export const ComplexImplType = ComplexImpl;
