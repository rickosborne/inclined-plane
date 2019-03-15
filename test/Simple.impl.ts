import {Simple} from "./Simple";

@Simple.provider
class SimpleImpl implements Simple {

}

/**
 * Exposed for testing.
 * Generally you don't want to export your implementations
 * because you _should_ be coding to the interface.
 */
export const SimpleImplType = SimpleImpl;
