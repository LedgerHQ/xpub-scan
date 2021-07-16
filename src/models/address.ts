import { configuration } from "../configuration/settings";
import { currencies, DerivationMode } from "../configuration/currencies";
import { Transaction } from "./transaction";
import { Operation } from "./operation";
import { Stats } from "./stats";
import { getAddress } from "../actions/deriveAddresses";
import { toUnprefixedCashAddress } from "../helpers";
import BigNumber from "bignumber.js";

class Address {
  address: string;
  derivationMode: DerivationMode;
  account: number;
  index: number;
  balance: BigNumber;
  transactions: Transaction[];
  rawTransactions: string; // TODO: perhaps not needed
  stats: Stats;
  ins: Operation[];
  outs: Operation[];
  utxo: boolean;

  constructor(
    itemToScan: string,
    derivationMode?: DerivationMode,
    account?: number,
    index?: number,
  ) {
    if (derivationMode) {
      this.address = getAddress(derivationMode, itemToScan, account!, index!);
    } else {
      this.address = itemToScan;
    }
    this.derivationMode = derivationMode!;
    this.account = account!;
    this.index = index!;
    this.ins = [];
    this.outs = [];
    this.utxo = false;
  }

  setTransactions(transactions: Transaction[]) {
    this.transactions = transactions;
  }

  setRawTransactions(rawTransactions: string) {
    this.rawTransactions = rawTransactions;
  }

  setBalance(balance: string | number) {
    this.balance = new BigNumber(balance);

    if (!this.balance.isZero()) {
      this.utxo = true;
    }
  }

  setStats(txsCount: number, fundedSum: number, spentSum: number) {
    this.stats = new Stats();
    this.stats.txsCount = txsCount;
    this.stats.funded = new BigNumber(fundedSum);
    this.stats.spent = new BigNumber(spentSum);
  }

  addFundedOperation(funded: Operation) {
    this.ins.push(funded);
  }

  getFundedOperations() {
    return this.ins;
  }

  addSentOperation(sent: Operation) {
    this.outs.push(sent);
  }

  getSpentOperations() {
    return this.outs;
  }

  toString() {
    return this.address;
  }

  // render as Cash Address (Bitcoin Cash)
  asCashAddress() {
    if (configuration.currency.symbol === currencies.bch.symbol) {
      return toUnprefixedCashAddress(this.address);
    }

    return undefined;
  }

  getDerivationMode() {
    return this.derivationMode;
  }

  getDerivation() {
    return {
      account: this.account,
      index: this.index,
    };
  }

  getBalance(): string {
    return this.balance.toFixed();
  }

  getStats() {
    return this.stats;
  }

  getTransactions() {
    return this.transactions;
  }

  getRawTransactions() {
    const rawTransactions = this.rawTransactions;

    if (typeof rawTransactions === "undefined") {
      return "[]"; // if no transaction, return an empty stringified JSON array
    } else {
      return rawTransactions;
    }
  }

  isUTXO() {
    return this.utxo;
  }
}

export { Address };
