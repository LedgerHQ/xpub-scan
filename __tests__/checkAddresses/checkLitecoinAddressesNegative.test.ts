import { _private } from "../../src/actions/checkAddress";
import { DERIVATION_SCOPE } from "../../src/configuration/settings";

const testSearchFunction = (xpub: string, providedAddress: string) => {
  return _private.search(
    xpub,
    providedAddress,
    DERIVATION_SCOPE.quick_search,
    "quick search",
  );
};

describe("check whether addresses belong or not to xpubs", () => {
  /* eslint-disable */
  console.log = function () {};

  const xpub =
    "Ltub2ZoLFXBt7mLeb4out9duUxMmqCSX9mqi73NcQ8nyjQsJEm76JP1poExdj9rRCFfHyuUVKgj5t2B2EBsmFvKivKzVpmKKZ4XiAVx65s3WZ8j";

  describe("addresses NOT belonging to the xpub", () => {
    it("complete legacy address", () => {
      const providedAddress = "LXSUUS8Phpm4zGsdfA7pFsDN17yyK8N2KA";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial legacy address", () => {
      const providedAddress = "LXSUUS8Ph?m4zGsdfA7pFsDN17yyK8N2?A";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("complete SegWit address", () => {
      const providedAddress = "MNY33b2fP4zLQ7W9oBGgw9TfFAm2TxWPAA";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial SegWit address", () => {
      const providedAddress = "MNY33b2fP4z?Q7W9oBGgw9TfFAm2T??PAA";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("complete native SegWit address", () => {
      const providedAddress = "bc1qxrkzds606tun4qghc8e6c5z4vuk3c0692cy0AA";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial native SegWit address", () => {
      const providedAddress = "bc1qxrkzds606tun?qghc8e6c5z4vuk3c0692cy0A?";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });
  });
});
