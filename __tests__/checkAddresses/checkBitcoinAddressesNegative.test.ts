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
    "xpub6C9vKwUFiBLbQKS6mhEAtEYhS24sVz8MkvMjxQSECTZVCnFmy675zojLthvXVuQf15RT6ggmt7PTgLBV2tLHHdJenoEkNWe5VPBETncxf2q";

  describe("addresses NOT belonging to the xpub", () => {
    it("complete legacy address", () => {
      const providedAddress = "1C3DK2BwhPRZ7e14V7pHj1jDWbTrP3qFnA";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial legacy address", () => {
      const providedAddress = "1C3DK2BwhPRZ7e?4V7pHj1jDWbTrP3qF?A";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("complete SegWit address", () => {
      const providedAddress = "3Bb1aYVQXiwowamm5kZDweK5KxVnzNKABA";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial SegWit address", () => {
      const providedAddress = "3Bb1aY??Xiwowamm5kZDweK5KxVnzNKA?A";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("complete native SegWit address", () => {
      const providedAddress = "bc1qxrkzds606tun4qghc8e6c5z4vuk3c0692cy0fA";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial native SegWit address", () => {
      const providedAddress = "bc1qxrkzds???tun4qghc8e6c5z4vuk3c0692cy0fA";
      const expectedResult = {};

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });
  });
});
