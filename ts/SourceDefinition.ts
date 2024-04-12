import {TypedItem} from "./decl";
import {ServiceState} from "./ServiceState";

/**
 * Base for definitions for class constructors and static suppliers.
 */
export abstract class SourceDefinition<INTERFACE> {
    protected static formatMethodName(
        className: string,
        delimiter: string,
        methodName: string,
        propertyKey: string | symbol | undefined
    ): string {
        if (methodName != null && methodName !== "") {
            return `${className}${delimiter}${methodName}`;
        } else if (propertyKey != null) {
            return `${className}${delimiter}${propertyKey.toString()}`;
        }
        /* istanbul ignore next */
        throw new Error("Unable to resolve method name");
    }

    /**
     * We lazily construct instances, so this starts undefined.
     */
    public instance?: INTERFACE;

    /**
     * For cycle detection, track the lifecycle of this singleton.
     */
    public state: ServiceState = ServiceState.Defined;

    protected constructor(
        public readonly name: string,
        public readonly delayed: boolean,
    ) {
    }

    /**
   * Produce an instance from the given args.
   * @param args Required param values.
   */
    abstract build(args: unknown[]): INTERFACE;

    /**
   * Types of the required params.
   */
    abstract getRequired(): TypedItem<unknown>[];

    /**
   * Perform any post-processing on the instance before it is returned to the caller.
   * @param instance Constructed but unconfigured object.
   */
    abstract process(instance: INTERFACE): void;
}
