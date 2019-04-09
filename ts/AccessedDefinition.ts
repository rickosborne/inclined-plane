import {ConstructedDefinition} from './ConstructedDefinition';
import {Constructor, FunctionParam, ManagedInstance, Method} from './decl';
import {Util} from './InjectableType';
import {SourceDefinition} from './SourceDefinition';

export class AccessedDefinition<IMPL extends ManagedInstance, PROXY extends ManagedInstance> extends SourceDefinition<IMPL> {
  private readonly proxyDefinition: ConstructedDefinition<PROXY>;

  constructor(
    public readonly proxyConstructor: Constructor<PROXY>,
    public readonly proxyMethod: Method<IMPL>,
    public readonly propertyKey: string | symbol | undefined,
    delayed: boolean,
  ) {
    super(SourceDefinition.formatMethodName(proxyConstructor.name, '.', proxyMethod.name, propertyKey), delayed);
    this.proxyDefinition = new ConstructedDefinition<PROXY>(proxyConstructor, delayed);
  }

  public build(args: any[]): IMPL {
    const proxy = Util.construct(this.proxyDefinition);
    return this.proxyMethod.apply(proxy, args);
  }

  public getRequired(): FunctionParam<any>[] {
    return Util.getOrCreateMethodParams(this.proxyMethod);
  }

  /**
   * @see {SourceDefinition.process}
   */
  process(instance: IMPL): void {
    if (typeof instance.postConstruct === 'function') {
      instance.postConstruct();
    }
  }
}
