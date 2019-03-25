import {SourceDefinition} from './SourceDefinition';
import {Util} from './InjectableType';
import {Constructor, FunctionParam, Method} from './decl';

/**
 * A (usually static) method that supplies instances of a specific type.
 */
export class SuppliedDefinition<INTERFACE> extends SourceDefinition<INTERFACE> {
  constructor(
    public readonly method: Method<INTERFACE>,
    public readonly thisArg: Constructor<any>,
    public readonly propertyKey?: string | symbol,
    delayed: boolean = false,
  ) {
    super(`${thisArg.name}#${method.name != null ? method.name : propertyKey == null ? '?' : propertyKey.toString()}`, delayed);
  }

  /**
   * @see {SourceDefinition.build}
   */
  build(args: any[]): INTERFACE {
    return this.method.apply(this.thisArg, args);
  }

  /**
   * @see {SourceDefinition.getRequired}
   */
  public getRequired(): FunctionParam<any>[] {
    return Util.getOrCreateMethodParams(this.method);
  }

  /**
   * @see {SourceDefinition.process}
   */
  process(instance: INTERFACE): void {
    // no-op, because we presume the supplier can do this
  }
}
