import {TypedItem} from './decl';
import {ServiceState} from './ServiceState';

/**
 * Base for definitions for class constructors and static suppliers.
 */
export abstract class SourceDefinition<INTERFACE> {
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
    public readonly delayed: boolean = false,
  ) {
  }

  /**
   * Produce an instance from the given args.
   * @param args Required param values.
   */
  abstract build(args: any[]): INTERFACE;

  /**
   * Types of the required params.
   */
  abstract getRequired(): TypedItem<any>[];

  /**
   * Perform any post-processing on the instance before it is returned to the caller.
   * @param instance Constructed but unconfigured object.
   */
  abstract process(instance: INTERFACE): void;
}
