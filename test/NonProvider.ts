import {Simple} from "./Simple";
import {Complex} from "./Complex";
import {NoImpls} from "./NoImpls";

export class NonProvider {
    private _didPostConstruct = false;

    constructor(
        @Simple.required public readonly simple: Simple,
        @Complex.required public readonly complex: Complex,
        @NoImpls.optional public readonly optional?: NoImpls,
    ) {
    }

    get didPostConstruct(): boolean {
        return this._didPostConstruct;
    }

    // noinspection JSUnusedLocalSymbols
    private postConstruct() {
        this._didPostConstruct = true;
    }
}
