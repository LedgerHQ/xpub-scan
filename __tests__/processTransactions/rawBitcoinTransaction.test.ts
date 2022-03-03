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

    expect(transaction.index).toEqual(1886);
    expect(transaction.timestamp).toEqual(1637412724);
    expect(transaction.transactionHash).toEqual(
      "6a832f494b57870a4cb8c9d4094373a6726ad501a12ee1106b371ef592df1df6",
    );

    expect(transaction.fee.amount).toEqual("0.00002244");

    expect(transaction.recipients).toMatchObject([
      {
        address: "3Q2AxuRxJnvddAa1wAm8PXeQCiBhkCGndi",
        amount: "0.00070000",
      },
      {
        address: "1GiCSuc1harcGUePV2EfZxmKoJou8V6KVE",
        amount: "0.00010056",
      },
    ]);

    expect(transaction.senders).toMatchObject([
      {
        address: "1CiWPcvoNz9DhrMbb8QLzX2GfhN96TDF78",
        amount: "0.00012300",
      },
      {
        address: "12bNVFv2eTy5wkDQKFT78a47Pk8TEaQjBL",
        amount: "0.00070000",
      },
    ]);
  });
});
