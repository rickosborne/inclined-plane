import {SourceDefinition} from './SourceDefinition';
import {Util} from './InjectableType';
import {Constructor, ConstructorParam, ManagedInstance, ManagedProperty} from './decl';

/**
 * Everything known about how to construct an {@code IMPL} concrete instance of a singleton.
 */
export class ConstructedDefinition<IMPL extends ManagedInstance> extends SourceDefinition<IMPL> {
  constructor(
    public readonly ctor: Constructor<IMPL>,
    delayed: boolean = false,
  ) {
    super(ctor.name, delayed);
  }

  /**
   * Injected properties
   */
  public get props(): ManagedProperty<any>[] {
    return Util.getProperties<IMPL>(this.ctor);
  }

  /**
   * @see {SourceDefinition.build}
   */
  build(args: any[]): IMPL {
    return new this.ctor(...args);
  }

  /**
   * @see {SourceDefinition.getRequired}
   */
  public getRequired(): ConstructorParam<any>[] {
    return Util.getOrCreateConstructorParams<IMPL>(this.ctor);
  }

  /**
   * @see {SourceDefinition.process}
   */
  process(instance: IMPL): void {
    for (const prop of this.props) {
      Util.injectProperty(instance, prop);
    }
    if (typeof instance.postConstruct === 'function') {
      instance.postConstruct();
    }
  }
}
