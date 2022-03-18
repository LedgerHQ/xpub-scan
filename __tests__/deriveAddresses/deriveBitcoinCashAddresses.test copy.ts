import { configuration } from "../../src/configuration/settings";
import { currencies, DerivationMode } from "../../src/configuration/currencies";
import { deriveAddress } from "../../src/actions/deriveAddresses";

describe("derive Bitcoin Cash addresses", () => {
  let xpub;
  let derivationMode;

  describe("derive Bitcoin Cash mainnet addresses", () => {
    beforeEach(() => {
      xpub =
        "xpub6CJgFcZxrd2yjt11C91E4xTb7whLw1amvXzzhhdmfqutTdbT53GS4nbS6pcsPQ2EJyPBxWi7Rvro2pqBVUuKj1BqET1gujWmLE6WJD7pb1o";
      configuration.currency = currencies.bch;
      configuration.currency.network = currencies.bch.network_mainnet;
    });

    describe("derive Legacy addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.LEGACY;
      });

      it("derive m/0/0", () => {
        const address = deriveAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("195D2Q9NPSpZxkD2gmEtNFzK8s65FS7QZB");
      });

      it("derive m/0/1", () => {
        const address = deriveAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("1Nchm2Yu65gGua1jNF1viaNPYLtjmmgzpe");
      });

      it("derive m/1/0", () => {
        const address = deriveAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("1JJEsMr4dpTtsA9JL8HyQVN2NZ4WsMuoMj");
      });

      it("derive m/1/1", () => {
        const address = deriveAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("1EL7PVjrHMNPpCk47T86URSzVRqccdexVy");
      });

      it("derive m/1/10000000", () => {
        const address = deriveAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("1Lutb2GiXzT1VmstpNp89Gdv5xK1WxS7yw");
      });
    });

    describe("derive SegWit addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.SEGWIT;
      });

      it("derive m/0/0", () => {
        const address = deriveAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("3Hznz37SVW7SCQVexMuHouGxS2JkT5SBcE");
      });

      it("derive m/0/1", () => {
        const address = deriveAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("3H4PXNXFZBMXXtj73a2M4ZnWyKcAFMcw7p");
      });

      it("derive m/1/0", () => {
        const address = deriveAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("3PXDUXZBqN1su1wYeBy1guBkUJVFLzupqP");
      });

      it("derive m/1/1", () => {
        const address = deriveAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("34DmE8fnF6dSHHtY3H2suDB3jDedBMZVMf");
      });

      it("derive m/1/10000000", () => {
        const address = deriveAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("3DdXQRrzTndRWyEiR1JRKVCJp7YZsJUwff");
      });
    });
  });
});
