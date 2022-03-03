import { configuration } from "../src/configuration/settings";
import { currencies, DerivationMode } from "../src/configuration/currencies";
import { getAddress } from "../src/actions/deriveAddresses";

describe("derive Bitcoin addresses", () => {
  let xpub;
  let derivationMode;

  describe("derive Bitcoin mainnet addresses", () => {
    beforeEach(() => {
      xpub =
        "xpub6DTLT6HYPfc617GkjHcJML8SWvL36eyxFYbUWtL5hqFtTEsdgjMm4v5meHyvmMAB8q6chfxbKgPb4LjZQxmd8iQFdRYP49PG6H7h7L1EEBS";
      configuration.currency = currencies.btc;
      configuration.currency.network = currencies.btc.network_mainnet;
    });

    describe("derive Taproot addresses", () => {
      beforeEach(() => {
        derivationMode = DerivationMode.TAPROOT;
      });

      it("derive m/0/0", () => {
        const address = getAddress(derivationMode, xpub, 0, 0);
        expect(address).toEqual("bc1pn2zdr3zd5d8la8nuq2aqtpxspgqet9v9dfl8c7w2flw9pra7jp5sdyeq9e");
      });
    });
  });
});