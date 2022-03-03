import { configuration } from "../../src/configuration/settings";
import { currencies, DerivationMode } from "../../src/configuration/currencies";
import { getAddress } from "../../src/actions/deriveAddresses";

describe("derive Litecoin addresses", () => {
  let xpub;
  let derivationMode;

  describe("derive Litecoin mainnet addresses", () => {
    beforeEach(() => {
      xpub =
        "Ltub2ZoLFXBt7mLeb4out9duUxMmqCSX9mqi73NcQ8nyjQsJEm76JP1poExdj9rRCFfHyuUVKgj5t2B2EBsmFvKivKzVpmKKZ4XiAVx65s3WZ8j";
      configuration.currency = currencies.ltc;
      configuration.currency.network = currencies.ltc.network_mainnet;
    });

    describe("derive Legacy addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.LEGACY;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("LQvJrXTHfAvUBGRs6LRTwC6nX7rYhzVbu9");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("LQFH5FQp2yi5NGspg8hGXeRJRzVYWAM2Ks");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("LYijJ7MzngZGGf5pQ1FBDLe23mjAM5dZWm");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("LTGro5xiqTsk7evvQmbAm4SqHq4X97pswZ");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("LUoTXPY5CfaXY3ZVMBbANX2erZK26bHsGP");
      });
    });

    describe("derive SegWit addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.SEGWIT;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("MBz6dSyR1RkkUa7iEiKsXapEGEK6hxjWci");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("MMN88qfy1JmdCdmccXWeJCXJGAiVLgRTCY");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("MPxw2xaMUSTHjGQwqw51RMjrPpbK4cT86S");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("MN6dPnaRuMRtGj7WXjdJw2F37fhV8s6f9X");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("MULBsckG2JmuWqryuEqKLsCDC2dGxUdJaj");
      });
    });

    describe("derive Native SegWit addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.NATIVE;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("ltc1q8ea8f4337su3ucfeaxq5pyyz3nttx6v3ehvg0l");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("ltc1qxuvt7k66rqdy7m76ckaum9cwcq2tezyc400gg0");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("ltc1qjs9dlgqa6lyu8m2w08yt0u20vaahcms2uxtdn6");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("ltc1qtpxmpgrhfwyvl3rtrl2dxjq3fma54y06prjy5a");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("ltc1qdy85jq4h6qsyc5ljayxev226rxp9gkupt4h9gt");
      });
    });
  });
});
