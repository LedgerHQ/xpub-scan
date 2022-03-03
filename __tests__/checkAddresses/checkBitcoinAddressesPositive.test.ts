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

  describe("addresses belonging to the xpub", () => {
    it("complete legacy address — m/2/588", () => {
      const providedAddress = "1C3DK2BwhPRZ7e14V7pHj1jDWbTrP3qFnt";
      const expectedResult = { account: 2, index: 588 };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial legacy address — m/2/588", () => {
      const providedAddress = "1C3DK?BwhPRZ7e14V7?Hj1jDWbTrP3?Fnt";
      const expectedResult = {
        account: 2,
        index: 588,
        partial: "1C3DK2BwhPRZ7e14V7pHj1jDWbTrP3qFnt",
      };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("complete SegWit address — m/3/999", () => {
      const providedAddress = "3Bb1aYVQXiwowamm5kZDweK5KxVnzNKABp";
      const expectedResult = { account: 3, index: 999 };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial SegWit address — m/3/999", () => {
      const providedAddress = "3Bb1aYVQ??wowamm5kZDweK5KxVnzNKA??";
      const expectedResult = {
        account: 3,
        index: 999,
        partial: "3Bb1aYVQXiwowamm5kZDweK5KxVnzNKABp",
      };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("complete native SegWit address — m/2/278", () => {
      const providedAddress = "bc1qxrkzds606tun4qghc8e6c5z4vuk3c0692cy0fl";
      const expectedResult = { account: 2, index: 278 };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });

    it("partial native SegWit address — m/2/278", () => {
      const providedAddress = "bc1qxrkzds?06tun4qghc8e6c5z4vuk3c0692cy0??";
      const expectedResult = {
        account: 2,
        index: 278,
        partial: "bc1qxrkzds606tun4qghc8e6c5z4vuk3c0692cy0fl",
      };

      const match = testSearchFunction(xpub, providedAddress);

      expect(match).toEqual(expectedResult);
    });
  });
});
