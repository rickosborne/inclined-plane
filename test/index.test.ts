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

describe('inclined-plane', () => {
  beforeEach(() => {
    Simple.resetCachedImplementations();
    Complex.resetCachedImplementations();
    ManyImpl.resetCachedImplementations();
    NoImpls.resetCachedImplementations();
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
        expect(() => ManyImpl.getInstance()).throws(/More than one implementation of ManyImpl: ManyOne, ManyTwo/);
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
});
