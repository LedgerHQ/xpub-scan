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
    "dgub8rDzyFqzw35B8zSqrW9sHDivXL2YmcGEVKyRMhPh8SoeUmkGozD5YzNyEkSH1T9zhvy9iQzns7igxrhQkg4jETWna4X1AUC4MT3YgHenTMB";

  describe("addresses belonging to the xpub", () => {
    it("complete address — m/1/640", () => {
      const providedAddress = "DSZsASgFRbGVhRnPE9bmeyd8s9izatDRXL";
      const expectedResult = { account: 1, index: 640 };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial address — m/1/640", () => {
      const providedAddress = "DSZsASgFR??VhRnPE9bmeyd8s9izatDR?L";
      const expectedResult = {
        account: 1,
        index: 640,
        partial: "DSZsASgFRbGVhRnPE9bmeyd8s9izatDRXL",
      };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });
  });
});
