/**
 * To detect cycles we keep track of types that are currently in the middle of the building process.
 */
export enum ServiceState {
  /**
   * No instances created yet.
   */
  Defined = 'Defined',
  /**
   * Instance creation has started but has not completed.
   */
  Building = 'Building',
  /**
   * An instance has been created.
   * @see {ConstructedDefinition.instance}
   */
  Built = 'Built',
}
