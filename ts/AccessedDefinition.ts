import {ConstructedDefinition} from "./ConstructedDefinition";
import {Constructor, FunctionParam, ManagedInstance, Method} from "./decl";
import {Util} from "./InjectableType";
import {SourceDefinition} from "./SourceDefinition";

export class AccessedDefinition<IMPL, PROXY extends ManagedInstance> extends SourceDefinition<IMPL> {
    private readonly proxyDefinition: ConstructedDefinition<PROXY>;

    constructor(
        public readonly proxyConstructor: Constructor<PROXY>,
        public readonly proxyMethod: Method<IMPL>,
        public readonly propertyKey: string | symbol | undefined,
        delayed: boolean,
    ) {
        super(SourceDefinition.formatMethodName(proxyConstructor.name, ".", proxyMethod.name, propertyKey), delayed);
        this.proxyDefinition = new ConstructedDefinition<PROXY>(proxyConstructor, delayed);
    }

    public build(args: unknown[]): IMPL {
        const proxy = Util.construct(this.proxyDefinition);
        return this.proxyMethod.apply(proxy, args) as IMPL;
    }

    public getRequired(): FunctionParam<unknown>[] {
        return Util.getOrCreateMethodParams(this.proxyMethod);
    }

    /**
   * @see {SourceDefinition.process}
   */
    process(instance: IMPL): void {
        if (instance instanceof Object && "postConstruct" in instance && typeof instance?.postConstruct === "function") {
            instance.postConstruct();
        }
    }
}
