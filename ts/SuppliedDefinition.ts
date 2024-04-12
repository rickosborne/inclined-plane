import {SourceDefinition} from "./SourceDefinition";
import {Util} from "./InjectableType";
import {Constructor, FunctionParam, Method} from "./decl";

/**
 * A (usually static) method that supplies instances of a specific type.
 */
export class SuppliedDefinition<INTERFACE> extends SourceDefinition<INTERFACE> {
    constructor(
        public readonly method: Method<INTERFACE>,
        public readonly thisArg: Constructor<unknown>,
        public readonly propertyKey: string | symbol | undefined,
        delayed: boolean,
    ) {
        super(SourceDefinition.formatMethodName(thisArg.name, "#", method.name, propertyKey), delayed);
    }

    /**
   * @see {SourceDefinition.build}
   */
    build(args: unknown[]): INTERFACE {
        return this.method.apply(this.thisArg, args) as INTERFACE;
    }

    /**
   * @see {SourceDefinition.getRequired}
   */
    public getRequired(): FunctionParam<unknown>[] {
        return Util.getOrCreateMethodParams(this.method);
    }

    /**
   * @see {SourceDefinition.process}
   */
    process(instance: INTERFACE): void {
    // no-op, because we presume the supplier can do this
    }
}
