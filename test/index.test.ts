import {describe, it, beforeEach} from 'mocha';
import {expect} from 'chai';
import {buildInstance} from "../ts";
import {Complex} from "./Complex";
import {Simple} from "./Simple";
import {SimpleImplType} from "./Simple.impl";
import {ComplexImplType} from "./Complex.impl";
import {ManyImpl} from "./ManyImpl";
import {ManyOneType, ManyTwoType} from "./ManyImpl.impl";
import {NoImpls} from "./NoImpls";
import {NonProvider} from "./NonProvider";
import {Unbuildable} from "./Unbuildable";
import {Late} from "./Late";
import {Supply, SupplyImplType} from "./Supply";
import {LateBuilt, LateComplicated, LateProviderType} from "./Late.impl";
import {Inheritance, InheritanceImpl} from "./Inheritance";
import {
  ConstructorCycleLeft,
  PropertyCycleLeft,
  PropertyCycleLeftType,
  PropertyCycleRight,
  PropertyCycleRightType
} from "./Cycle";

describe('inclined-plane', () => {
  beforeEach(() => {
    [Simple, Complex, ManyImpl, NoImpls, Late, Inheritance, Supply]
      .forEach(type => type.resetCachedImplementations());
  });

  describe('buildInstance', () => {
    it('instantiates non-provider classes', () => {
      const instance = buildInstance(NonProvider);
      expect(instance).is.instanceOf(NonProvider);
    });
    it('calls postConstruct, even if private', () => {
      const managed = buildInstance(NonProvider);
      expect(managed.didPostConstruct).equals(true);
      const simple = new SimpleImplType();
      const unmanaged = new NonProvider(simple, new ComplexImplType(simple));
      expect(unmanaged.didPostConstruct).equals(false);
    });
    it('throws when a type cannot be built due to dependency issues', () => {
      expect(() => buildInstance(Unbuildable)).throws(/Could not construct Unbuildable param NoImpls/);
    });
    it('injects late properties', () => {
      const late = buildInstance(LateBuilt);
      expect(late).is.instanceOf(LateBuilt);
      expect(late.simple).is.instanceOf(SimpleImplType);
      expect(late.noImpls).equals(undefined);
      const manual = new LateBuilt();
      expect(manual.simple).equals(undefined);  // when unmanaged
    });
    it('handles cases where injected properties already have defined descriptors', () => {
      const complicated = buildInstance(LateComplicated);
      expect(complicated).is.instanceOf(LateComplicated);
      expect(complicated.simple).is.instanceOf(SimpleImplType);
      expect(complicated.noImpls).equals(undefined);
      const manual = new LateComplicated();
      expect(manual.simple).equals(undefined);  // when unmanaged
    });
  });

  describe('InjectableType', () => {
    describe('getInstance', () => {
      it('instantiates implementations without params', () => {
        const simple = Simple.getInstance();
        expect(simple).is.instanceOf(SimpleImplType);
      });
      it('returns the same instance for each invocation', () => {
        const first = Simple.getInstance();
        const second = Simple.getInstance();
        expect(second).equals(first);
      });
      it('instantiates implementations with params', () => {
        const complex = Complex.getInstance();
        expect(complex).is.instanceOf(ComplexImplType);
        const simple = Simple.getInstance();
        expect(simple).is.instanceOf(SimpleImplType);
        expect(complex.simple).equals(simple);
        expect(complex.noImpls).equals(undefined);
      });
      it('throws when a type cannot be built due to lack of providers', () => {
        expect(() => NoImpls.getInstance()).throws(/No implementations known for NoImpls/);
      });
      it('throws when a more than one provider', () => {
        expect(() => ManyImpl.getInstance()).throws(/More than one source of ManyImpl: ManyOne, ManyTwo/);
      });
      it('injects late properties', () => {
        const late = Late.getInstance();
        expect(late).is.instanceOf(LateProviderType);
        expect(late.simple).is.instanceOf(SimpleImplType);
        expect(late.noImpls).equals(undefined);
        const manual = new LateProviderType();
        expect(manual.simple).equals(undefined);  // when unmanaged
      });
    });

    describe('supplier', () => {
      it('works on static methods', () => {
        const supplied = Supply.getInstance();
        expect(supplied).is.instanceOf(SupplyImplType);
        expect(supplied.simple).is.instanceOf(SimpleImplType);
      });
    });

    describe('getInstances', () => {
      it('finds all implementations', () => {
        const multi = ManyImpl.getInstances();
        expect(multi).to.haveOwnProperty('length').equals(2);
        const foundNames: { [key: string]: boolean } = {};
        for (const impl of multi) {
          if (!(impl instanceof ManyOneType) && !(impl instanceof ManyTwoType)) {
            throw new Error(`Was not expecting: ${impl.constructor.name}`);
          }
          foundNames[impl.constructor.name] = true;
        }
        expect(foundNames).to.deep.eq({
          [ManyOneType.name]: true,
          [ManyTwoType.name]: true,
        });
      });
      it('returns an empty array for no impls', () => {
        const multi = NoImpls.getInstances();
        expect(multi).to.deep.eq([]);
      });
    });
    describe('resetCachedImplementations', () => {
      it('returns different instances', () => {
        const first = Simple.getInstance();
        expect(first).does.not.eq(null);
        Simple.resetCachedImplementations();
        const second = Simple.getInstance();
        expect(second).does.not.eq(null);
        expect(second).does.not.equal(first);
      });
    });
  });

  describe('cycles', () => {
    it('fails for constructor cycles', () => {
      expect(() => ConstructorCycleLeft.getInstance()).throws(/Dependency cycle detected while trying to build ConstructorCycle/);
    });
    it('property cycles are supported', () => {
      const left = PropertyCycleLeft.getInstance();
      expect(left).is.instanceOf(PropertyCycleLeftType);
      const right = PropertyCycleRight.getInstance();
      expect(right).is.instanceOf(PropertyCycleRightType);
      expect(left.right).equals(right);
      expect(right.left).equals(left);
    });
  });

  describe('inheritance', () => {
    it('inject properties into parent classes', () => {
      const built = buildInstance(InheritanceImpl);
      expect(built.simple).is.instanceOf(SimpleImplType);
    });
  });
});
