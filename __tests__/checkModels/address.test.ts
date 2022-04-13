import { configuration } from "../../src/configuration/settings";
import { currencies, DerivationMode } from "../../src/configuration/currencies";
import { Address } from "../../src/models/address";
import { Operation } from "../../src/models/operation";
import { Transaction } from "../../src/models/transaction";
import fakeRawTransaction from "./fakeRawTransactions.json";

const account = 0;
const index = 0;

describe("create a Bitcoin address object", () => {
  let xpub;
  let address;

  beforeEach(() => {
    configuration.currency = currencies.btc;
    configuration.currency.network = currencies.btc.network_mainnet;

    xpub =
      "xpub6C9vKwUFiBLbQKS6mhEAtEYhS24sVz8MkvMjxQSECTZVCnFmy675zojLthvXVuQf15RT6ggmt7PTgLBV2tLHHdJenoEkNWe5VPBETncxf2q";

    address = new Address(xpub, DerivationMode.LEGACY, account, index);
  });

  it("generate a valid Bitcoin address object", () => {
    expect(address.toString()).toEqual("1AC4EypEKiobnZfDv1pSEt28g3D4MwY5WB");
    expect(address.asCashAddress()).toBeUndefined;
    expect(address.account).toEqual(account);
    expect(address.index).toEqual(index);
    expect(address.getDerivationMode()).toEqual("Legacy");
    expect(address.getDerivation()).toMatchObject({
      account,
      index,
    });
  });

  it("set and get balance as a string", () => {
    const balance = "123.456789";

    address.setBalance(balance);

    expect(address.getBalance()).toMatch(balance);
    expect(address.isUTXO()).toEqual(true);
  });

  it("set and get balance as a number", () => {
    const balance = 123.456789;

    address.setBalance(balance);

    expect(address.getBalance()).toEqual(balance.toPrecision());
    expect(address.isUTXO()).toEqual(true);
  });

  it("set and get an empty balance", () => {
    const balance = "0";

    address.setBalance(balance);

    expect(address.getBalance()).toEqual(balance);
    expect(address.isUTXO()).toEqual(false);
  });

  it("set and get basic stats", () => {
    const transactionsCount = 1;
    const totalFunded = 0.987654321;
    const totalSpent = 0.123456789;

    address.setStats(transactionsCount, totalFunded, totalSpent);

    const stats = address.getStats();

    expect(stats.txsCount.toString()).toEqual(transactionsCount.toString());
    expect(stats.funded.toString()).toEqual(totalFunded.toString());
    expect(stats.spent.toString()).toEqual(totalSpent.toString());
  });

  describe("set and get transactional objects", () => {
    const op1 = new Operation("2020-05-28T00:00:00Z", "0.00001");
    const op2 = new Operation("2020-05-28T00:00:00Z", "0.123");
    const op3 = new Operation("2020-05-28T00:00:00Z", "0.0000001");
    const op4 = new Operation("2022-05-22T00:00:00Z", "0.9999");

    const transaction1 = new Transaction(
      10,
      "2020-05-28T00:00:00Z",
      "6a832f494b57870a4cb8c9d4094373a6726ad501a12ee1106b371ef592df1df6",
      [op1, op2],
      [op3],
    );

    const transaction2 = new Transaction(
      10,
      "2022-05-22T00:00:00Z",
      "91bef9ebc0b0c680765faaa2e050f6ca871ce3c7fca69a22278aa77692041974",
      [],
      [op4],
    );

    it("try to get raw transactions", () => {
      expect(address.getRawTransactions()).toMatchObject([]);
    });

    it("set and get raw transactions", () => {
      address.setRawTransactions(fakeRawTransaction);

      expect(address.getRawTransactions()).toMatchObject(fakeRawTransaction);
    });

    it("set and get normalized transactions", () => {
      const normalizedTransactions = [transaction1, transaction2];

      address.setTransactions(normalizedTransactions);

      expect(address.getTransactions()).toMatchObject(normalizedTransactions);
    });

    it("set and get funded transactions", () => {
      address.addFundedOperation(op1);

      expect(address.getFundedOperations()).toMatchObject([op1]);
    });

    it("set and get sent transactions", () => {
      address.addSentOperation(op2);

      expect(address.getSentOperations()).toMatchObject([op2]);
    });
  });
});

describe("create a Bitcoin Cash address object", () => {
  let xpub;
  let address;

  beforeEach(() => {
    configuration.currency = currencies.bch;
    configuration.currency.network = currencies.bch.network_mainnet;

    xpub =
      "xpub6CJgFcZxrd2yjt11C91E4xTb7whLw1amvXzzhhdmfqutTdbT53GS4nbS6pcsPQ2EJyPBxWi7Rvro2pqBVUuKj1BqET1gujWmLE6WJD7pb1o";

    address = new Address(xpub, DerivationMode.BCH, account, index);
  });

  it("generate a valid Bitcoin Cash address object", () => {
    expect(address.toString()).toEqual("195D2Q9NPSpZxkD2gmEtNFzK8s65FS7QZB");
    expect(address.account).toEqual(account);
    expect(address.index).toEqual(index);
    expect(address.derivationMode).toEqual("Bitcoin Cash");
    expect(address.getDerivation()).toMatchObject({
      account,
      index,
    });
  });

  it("generate a valid Bitcoin Cash address as string", () => {
    configuration.currency = currencies.bch;

    expect(address.asCashAddress()).toEqual(
      "qpvgedg5e92ut08ksxrw0w9l9xevecfwg5dg503vfy",
    );
  });
});

describe("create an Ethereum address object", () => {
  let ethereumAddress;
  let address;

  beforeEach(() => {
    configuration.currency = currencies.eth;

    ethereumAddress = "0x243b14754EF82F881a4a81f9af07c58Ea5eb4a87";

    address = new Address(ethereumAddress);
  });

  it("generate a valid Ethereum address object", () => {
    expect(address.toString()).toEqual(
      "0x243b14754EF82F881a4a81f9af07c58Ea5eb4a87",
    );
  });
});
