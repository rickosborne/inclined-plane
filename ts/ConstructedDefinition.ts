import {SourceDefinition} from "./SourceDefinition";
import {Util} from "./InjectableType";
import { Constructor, ConstructorParam, isManagedInstance, ManagedProperty } from "./decl";

/**
 * Everything known about how to construct an {@code IMPL} concrete instance of a singleton.
 */
export class ConstructedDefinition<IMPL> extends SourceDefinition<IMPL> {
    constructor(
        public readonly ctor: Constructor<IMPL>,
        delayed: boolean = false,
    ) {
        super(ctor.name, delayed);
    }

    /**
   * Injected properties
   */
    public get props(): ManagedProperty<unknown>[] {
        return Util.getProperties<IMPL>(this.ctor);
    }

    /**
   * @see {SourceDefinition.build}
   */
    build(args: unknown[]): IMPL {
        return new this.ctor(...args as never[]);
    }

    /**
   * @see {SourceDefinition.getRequired}
   */
    public getRequired(): ConstructorParam<unknown>[] {
        return Util.getOrCreateConstructorParams<IMPL>(this.ctor);
    }

    /**
   * @see {SourceDefinition.process}
   */
    process(instance: IMPL): void {
        for (const prop of this.props) {
            Util.injectProperty(instance, prop);
        }
        if (isManagedInstance(instance)) {
            instance.postConstruct?.();
        }
    }
}
