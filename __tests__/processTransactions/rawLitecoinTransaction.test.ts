import { getStats } from "../../src/actions/processTransactions";
import { Address } from "../../src/models/address";
import { init } from "../../src/helpers";

describe("process transactions", () => {
  /* eslint-disable */
  console.log = function () {};

  const xpub =
    "Ltub2ZoLFXBt7mLeb4out9duUxMmqCSX9mqi73NcQ8nyjQsJEm76JP1poExdj9rRCFfHyuUVKgj5t2B2EBsmFvKivKzVpmKKZ4XiAVx65s3WZ8j";
  const address = new Address("ltc1qxuvt7k66rqdy7m76ckaum9cwcq2tezyc400gg0");

  beforeAll(async () => {
    init(xpub);
    await getStats(address, false);
  });

  it("check balance", async () => {
    const balance = address.getBalance();
    expect(balance).toEqual("0.3");
  });

  it("check total funded", async () => {
    const totalFunded = address.getStats().funded.toString();
    expect(totalFunded).toEqual("0.3");
  });

  it("check total spent", async () => {
    const totalSpent = address.getStats().spent.toString();
    expect(totalSpent).toEqual("0");
  });

  it("check raw transactions", async () => {
    const rawTransactions = address.getRawTransactions();

    const transaction = rawTransactions[0];

    expect(transaction.time).toEqual(1631109836);
    expect(transaction.block_no).toEqual(2119238);
    expect(transaction.txid).toEqual(
      "079ca7469ac5a3eafc0525841ee93a07c4d180270a0ad3b773e345b043f032a4",
    );
  });
});
