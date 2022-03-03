import { getStats } from "../../src/actions/processTransactions";
import { Address } from "../../src/models/address";
import { init } from "../../src/helpers";

describe("process transactions", () => {
  /* eslint-disable */
  console.log = function () {};

  const xpub =
    "xpub6C9vKwUFiBLbQKS6mhEAtEYhS24sVz8MkvMjxQSECTZVCnFmy675zojLthvXVuQf15RT6ggmt7PTgLBV2tLHHdJenoEkNWe5VPBETncxf2q";
  const address = new Address("1GiCSuc1harcGUePV2EfZxmKoJou8V6KVE");

  beforeAll(async () => {
    init(xpub);
    await getStats(address, false);
  });

  it("check balance", async () => {
    const balance = address.getBalance();
    expect(balance).toEqual("0.00010056");
  });

  it("check total funded", async () => {
    const totalFunded = address.getStats().funded.toString();
    expect(totalFunded).toEqual("0.00010056");
  });

  it("check total spent", async () => {
    const totalSpent = address.getStats().spent.toString();
    expect(totalSpent).toEqual("0");
  });

  it("check raw transactions", async () => {
    const rawTransactions = address.getRawTransactions();

    const transaction = rawTransactions[0];

    expect(transaction.time).toEqual(1637411892);
    expect(transaction.block_no).toEqual(710566);
    expect(transaction.txid).toEqual(
      "6a832f494b57870a4cb8c9d4094373a6726ad501a12ee1106b371ef592df1df6",
    );
  });
});
