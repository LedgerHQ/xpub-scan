import { _private } from "../src/actions/checkAddress";
import { DERIVATION_SCOPE } from "../src/configuration/settings";

const testSearchFunction = (xpub: string, providedAddress: string) => {
  return _private.search(
    xpub,
    providedAddress,
    DERIVATION_SCOPE.quick_search,
    "quick search",
  );
};

describe("check whether addresses belong or not to xpubs", () => {
  console.log = function () {};

  let xpub;

  beforeEach(() => {
    xpub =
      "Ltub2ZoLFXBt7mLeb4out9duUxMmqCSX9mqi73NcQ8nyjQsJEm76JP1poExdj9rRCFfHyuUVKgj5t2B2EBsmFvKivKzVpmKKZ4XiAVx65s3WZ8j";
  });

  describe("addresses belonging to the xpub", () => {
    it("complete legacy address — m/1/640", () => {
      const providedAddress = "LXSUUS8Phpm4zGsdfA7pFsDN17yyK8N2Km";
      const expectedResult = { account: 1, index: 640 };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial legacy address — m/1/640", () => {
      const providedAddress = "LXSUUS8Ph??4zGsdfA7pFsDN17yyK8N2K?";
      const expectedResult = {
        account: 1,
        index: 640,
        partial: "LXSUUS8Phpm4zGsdfA7pFsDN17yyK8N2Km",
      };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("complete SegWit address — m/3/3", () => {
      const providedAddress = "MNY33b2fP4zLQ7W9oBGgw9TfFAm2TxWPAY";
      const expectedResult = { account: 3, index: 3 };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial SegWit address — m/3/3", () => {
      const providedAddress = "MNY33b2fP4zLQ7W9oBGgw9TfFAm2TxW???";
      const expectedResult = {
        account: 3,
        index: 3,
        partial: "MNY33b2fP4zLQ7W9oBGgw9TfFAm2TxWPAY",
      };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("complete native SegWit address — m/3/898", () => {
      const providedAddress = "ltc1q2vld3k49e7425kwtu2h0507pnx026gcyy4qgvd";
      const expectedResult = { account: 3, index: 898 };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial native SegWit address — m/3/898", () => {
      const providedAddress = "ltc1q2vld3k49e742??wtu2h?507pnx026gcyy4qg?d";
      const expectedResult = {
        account: 3,
        index: 898,
        partial: "ltc1q2vld3k49e7425kwtu2h0507pnx026gcyy4qgvd",
      };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });
  });

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
