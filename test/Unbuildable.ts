import {NoImpls} from "./NoImpls";

export class Unbuildable {
    constructor(
        @NoImpls.required public readonly noImpls: NoImpls
    ) {}
}
