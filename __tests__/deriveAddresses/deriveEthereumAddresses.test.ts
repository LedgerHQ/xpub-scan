import { configuration } from "../../src/configuration/settings";
import { currencies, DerivationMode } from "../../src/configuration/currencies";
import { getAddress } from "../../src/actions/deriveAddresses";

describe("derive Ethereum addresses", () => {
  let derivationMode;

  beforeEach(() => {
    derivationMode = DerivationMode.ETHEREUM;
    configuration.currency = currencies.eth;
  });

  it("derive from xpub6Fx82V...zwKG5g4Sc6", () => {
    const xpub =
      "xpub6Fx82VfZ6EdtNfD7eANUEvKYxB2AV4hf4Xm4LpiyNVmNHDGKu7T72WVr7qmCzKFC3VQMYrMMNJVy9BNXKUtUebxZx7kRYNG89zwKG5g4Sc6";
    const address = getAddress(derivationMode, xpub);
    expect(address).toEqual("0xb56aa13aab4869da8ae07ad2a04ec2deec35e0f0");
  });

  it("derive from xpub6GkCbW...Lejvh9nHE", () => {
    const xpub =
      "xpub6GkCbW4FDnz8k9zhroVhZefi9fXhFFuTmmcQqfQKPDBrQjtSu4pdLpQ1Tje1BAzUw6PbJ47MMtNZ4RYM42VzRNxwaYUFnm3R44Lejvh9nHE";
    const address = getAddress(derivationMode, xpub);
    expect(address).toEqual("0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1");
  });
});
