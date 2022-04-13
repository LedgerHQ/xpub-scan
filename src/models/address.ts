import { DerivationMode } from "../configuration/currencies";
import { Transaction } from "./transaction";
import { Operation } from "./operation";
import { Stats } from "./stats";
import { deriveAddress } from "../actions/deriveAddresses";
import { toUnprefixedCashAddress } from "../helpers";
import BigNumber from "bignumber.js";

class Address {
  address: string;
  derivationMode: DerivationMode;
  account: number;
  index: number;
  balance: BigNumber;
  transactions: Array<Transaction>;
  rawTransactions: Array<any>;
  stats: Stats;
  ins: Array<Operation>;
  outs: Array<Operation>;
  utxo: boolean;

  constructor(
    itemToScan: string,
    derivationMode?: DerivationMode,
    account?: number,
    index?: number,
  ) {
    if (derivationMode) {
      this.address = deriveAddress(derivationMode, itemToScan, account, index);
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

  setTransactions(transactions: Array<Transaction>) {
    this.transactions = transactions;
  }

  setRawTransactions(rawTransactions: Array<any>) {
    this.rawTransactions = rawTransactions;
  }

  setBalance(balance: string | number) {
    this.balance = new BigNumber(balance);

    if (!this.balance.isZero()) {
      this.utxo = true;
    } else {
      this.utxo = false;
    }
  }

  setStats(
    txsCount: string | number,
    fundedSum: string | number,
    spentSum: string | number,
  ) {
    this.stats = new Stats();
    this.stats.txsCount = new BigNumber(txsCount);
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

  getSentOperations() {
    return this.outs;
  }

  toString() {
    return this.address;
  }

  // render as Cash Address (Bitcoin Cash)
  asCashAddress() {
    if (this.derivationMode === DerivationMode.BCH) {
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
      return []; // if no transaction, return an empty array
    } else {
      return rawTransactions;
    }
  }

  isUTXO() {
    return this.utxo;
  }
}

export { Address };
