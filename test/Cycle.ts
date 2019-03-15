import {injectableType} from "../ts";

interface ConstructorCycleLeft {
  right: ConstructorCycleRight;
}

interface ConstructorCycleRight {
  left: ConstructorCycleLeft;
}

interface PropertyCycleLeft {
  right: PropertyCycleRight | undefined;
}

interface PropertyCycleRight {
  left: PropertyCycleLeft | undefined;
}

export const ConstructorCycleLeft = injectableType<ConstructorCycleLeft>('ConstructorCycleLeft');
export const ConstructorCycleRight = injectableType<ConstructorCycleRight>('ConstructorCycleRight');
export const PropertyCycleLeft = injectableType<PropertyCycleLeft>('PropertyCycleLeft');
export const PropertyCycleRight = injectableType<PropertyCycleRight>('PropertyCycleRight');

@ConstructorCycleLeft.provider
class ConstructorCycleLeftProvider implements ConstructorCycleLeft {
  constructor(
    @ConstructorCycleRight.required public readonly right: ConstructorCycleRight
  ) {
  }
}

@ConstructorCycleRight.provider
class ConstructorCycleRightProvider implements ConstructorCycleRight {
  constructor(
    @ConstructorCycleLeft.required public readonly left: ConstructorCycleLeft
  ) {
  }
}

@PropertyCycleLeft.provider
class PropertyCycleLeftProvider implements PropertyCycleLeft {
  @PropertyCycleRight.inject public readonly right: PropertyCycleRight | undefined;
}

@PropertyCycleRight.provider
class PropertyCycleRightProvider implements PropertyCycleRight {
  @PropertyCycleLeft.inject public readonly left: PropertyCycleLeft | undefined;
}

export const ConstructorCycleLeftType = ConstructorCycleLeftProvider;
export const ConstructorCycleRightType = ConstructorCycleRightProvider;
export const PropertyCycleLeftType = PropertyCycleLeftProvider;
export const PropertyCycleRightType = PropertyCycleRightProvider;
