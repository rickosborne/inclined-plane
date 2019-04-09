import {
  CoreActions,
  InjectableType,
  InstanceResolver,
  setDefaultInstanceResolver
} from './InjectableType';

/**
 * Default logic for linking types to instances.
 */
@InstanceResolver.implementation.delayed
export class DefaultInstanceResolver implements InstanceResolver {
  /**
   * @see InstanceResolver.many
   */
  public many<INTERFACE>(type: InjectableType<INTERFACE>, actions: CoreActions): INTERFACE[] {
    return type.sources
      .map(source => [actions.construct(source), source.delayed ? 1 : 0] as [INTERFACE, number])
      .sort((a, b) => a[1] - b[1])
      .map(pair => pair[0]);
  }

  /**
   * @see InstanceResolver.maybeOne
   */
  public maybeOne<INTERFACE>(type: InjectableType<INTERFACE>, actions: CoreActions): INTERFACE | undefined {
    const impls = this.many(type, actions);
    if (impls.length === 0) {
      return undefined;
    } else if (impls.length > 1) {
      throw new Error(`More than one source of ${type.name}: ${type.sourceNames.join(', ')}`);
    } else {
      return impls[0];
    }
  }
}

/**
 * There are chicken-egg dependency resolution problems,
 * so we prime the InstanceResolver cache with this.
 */
setDefaultInstanceResolver(new DefaultInstanceResolver());
