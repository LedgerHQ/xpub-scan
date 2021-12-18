import { configuration } from "../src/configuration/settings";
import { currencies, DerivationMode } from "../src/configuration/currencies";
import { getAddress } from "../src/actions/deriveAddresses";

describe("derive Bitcoin addresses", () => {
  let xpub;
  let derivationMode;

  describe("derive Bitcoin mainnet addresses", () => {
    beforeEach(() => {
      xpub =
        "xpub6C9vKwUFiBLbQKS6mhEAtEYhS24sVz8MkvMjxQSECTZVCnFmy675zojLthvXVuQf15RT6ggmt7PTgLBV2tLHHdJenoEkNWe5VPBETncxf2q";
      configuration.currency = currencies.btc;
      configuration.currency.network = currencies.btc.network_mainnet;
    });

    describe("derive Legacy addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.LEGACY;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("1AC4EypEKiobnZfDv1pSEt28g3D4MwY5WB");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("12hLWc8AXB6sikou3raetiMtNWR3dXjR5r");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("1GiCSuc1harcGUePV2EfZxmKoJou8V6KVE");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("1DfgByahHwa2rs8e5AQQ3EXGxS1akWpK8d");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("17Csc51yzoY74HNU6DLf3LcPNtNVf2JRhM");
      });
    });

    describe("derive SegWit addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.SEGWIT;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("3KwhDgypnTVdEDsF9PCDJcizjVWemGXB3X");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("33ZsFvSgNt5LfRZarSCiLFeGMdgtBsu5eN");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("3FJCQWSjxcRoE5KzEhtxUzD8NEgSMk5oXn");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("33uXGPKEbtNtxbvEJ6tJUcxWkxFRQDLtMP");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("35GUpR3pkEsUNV8n7mg67NqL9ctDs8q8z1");
      });
    });

    describe("derive Native SegWit addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.NATIVE;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("bc1qvngxns2mvj00uptukvnh63apg6mg4ac3wan0xz");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("bc1qz2vselsfhyqckeelqgks4avuav95nkzc2gt092");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("bc1q43287ymsj3zeg3wvqv355yq8aa4yhwf998wmhj");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("bc1qgs8e92jz68wg9cn4uewasqc9e9hamfcexcnn82");
      });
    });
  });

  describe("derive Bitcoin testnet addresses", () => {
    beforeEach(() => {
      xpub =
        "tpubDCCpYzH6NwKVnAipf8ChTfiTG4XtmxncwL97rQGLJ3SqfFCWzDq78LX1a7s2WXJsyfvR6bMiLkC7FSXLGoBo3dsH6DE9JKJb6LQSPasuSWj";
      configuration.currency = currencies.btc;
      configuration.currency.network = currencies.btc.network_testnet;
    });

    describe("derive Legacy addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.LEGACY;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("mmv9shvEyT8S3zvuCpjqqF66o4hbAcQuep");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("mgB5hxwThBUvZL9JaSKJ1M6vp8PcpkX4SK");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("mnUoHb6kCwnWmX7UoE4D4uiKH99VvPzXMg");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("mjUpakufYeoLDwMjqZd8nVxndMWAmACJ5M");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("mo2Ynyn89spBJNKqvC4Evq7w8fMs9KmSfD");
      });
    });

    describe("derive SegWit addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.SEGWIT;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("2N8gfmL6ffuLTqrxie5GEJwhNahuoviWx51");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("2N5Aj5P7qZz26xS7FkvPPXzAL3KFu7nCNEa");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("2N4AwppWA11uaa17S92qoVGy4uHL5nYm9jq");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("2N1ec7LYa3cuXytxrUmJmWBE4gTkCaAvwf9");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("2Mz98kL4gs2gsZAhcBuCmT8SNBA6oXvDKaK");
      });
    });

    describe("derive Native SegWit addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.NATIVE;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("tb1qgcel6r30c8pvjlplh9j3w55qnlv6r2dk5j9gv5");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("tb1qqu6luaj7pgl5del4lgp6mujr0nmlg0ktp4ju9r");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("tb1qf3sgwmmh8t9d640ea8hst058kryc9wm35twege");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("tb1q9dunhjjwxm8fx24hrxvvmxnt39d7tq0gfw8zlg");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("tb1q2fsmm5zz3258ulpquftfl2s0jeuzfhy9uwwwee");
      });
    });
  });
});

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
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("195D2Q9NPSpZxkD2gmEtNFzK8s65FS7QZB");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("1Nchm2Yu65gGua1jNF1viaNPYLtjmmgzpe");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("1JJEsMr4dpTtsA9JL8HyQVN2NZ4WsMuoMj");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("1EL7PVjrHMNPpCk47T86URSzVRqccdexVy");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("1Lutb2GiXzT1VmstpNp89Gdv5xK1WxS7yw");
      });
    });

    describe("derive SegWit addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.SEGWIT;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("3Hznz37SVW7SCQVexMuHouGxS2JkT5SBcE");
      });

      it("derive m/0/1", () => {
        const address = getAddress(derivationMode, xpub, 0, 1);
        expect(address).toEqual("3H4PXNXFZBMXXtj73a2M4ZnWyKcAFMcw7p");
      });

      it("derive m/1/0", () => {
        const address = getAddress(derivationMode, xpub, 1, 0);
        expect(address).toEqual("3PXDUXZBqN1su1wYeBy1guBkUJVFLzupqP");
      });

      it("derive m/1/1", () => {
        const address = getAddress(derivationMode, xpub, 1, 1);
        expect(address).toEqual("34DmE8fnF6dSHHtY3H2suDB3jDedBMZVMf");
      });

      it("derive m/1/10000000", () => {
        const address = getAddress(derivationMode, xpub, 1, 10000000);
        expect(address).toEqual("3DdXQRrzTndRWyEiR1JRKVCJp7YZsJUwff");
      });
    });
  });
});

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
