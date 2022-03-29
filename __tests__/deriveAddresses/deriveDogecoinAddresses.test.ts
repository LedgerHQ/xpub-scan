import { configuration } from "../../src/configuration/settings";
import { currencies, DerivationMode } from "../../src/configuration/currencies";
import { deriveAddress } from "../../src/actions/deriveAddresses";

describe("derive Dogecoin addresses", () => {
  let xpub;
  let derivationMode;

  describe("derive Dogecoin mainnet addresses", () => {
    beforeEach(() => {
      xpub =
        "dgub8rDzyFqzw35B8zSqrW9sHDivXL2YmcGEVKyRMhPh8SoeUmkGozD5YzNyEkSH1T9zhvy9iQzns7igxrhQkg4jETWna4X1AUC4MT3YgHenTMB";
      configuration.currency = currencies.doge;
      configuration.currency.network = currencies.doge.network_mainnet;
      derivationMode = DerivationMode.DOGECOIN;
    });

    it("derive m/0/0", () => {
      const address = deriveAddress(derivationMode, xpub, 0, 0);
      expect(address).toEqual("DNoFXKQVgbYU5pnpJEoiJjoWs1yH74KcvC");
    });

    it("derive m/0/1", () => {
      const address = deriveAddress(derivationMode, xpub, 0, 1);
      expect(address).toEqual("DNKtLJKxfYascpVyVHyQ73S65ssKQtH95A");
    });

    it("derive m/1/0", () => {
      const address = deriveAddress(derivationMode, xpub, 1, 0);
      expect(address).toEqual("DLnAvdtK2DDGeakaQUf2BUvZVUJw7KRgTg");
    });

    it("derive m/1/1", () => {
      const address = deriveAddress(derivationMode, xpub, 1, 1);
      expect(address).toEqual("DC6Pmh6eGENRC8T2cu5roTXPPQXBMk8b2o");
    });

    it("derive m/1/10000000", () => {
      const address = deriveAddress(derivationMode, xpub, 1, 10000000);
      expect(address).toEqual("D6Yf9DRNY8VSTtorybWJzJbDBugExnMTsg");
    });
  });
});
