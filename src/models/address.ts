import { AddressType } from "../settings";
import { Transaction } from "./transaction";
import { Operation } from "./operation";
import { Stats } from "./stats";
import { getAddress } from "../actions/deriveAddresses"

class Address {
  address: string;
  type: AddressType;
  account: number;
  index: number;
  balance: number;
  transactions: Transaction[];
  rawTransactions: string; // TODO: perhaps not needed
  stats: Stats;
  ins: Operation[];
  outs: Operation[];

  constructor(type: AddressType, xpub: string, account: number, index: number) {
    this.address = getAddress(type, xpub, account, index);
    this.type = type;
    this.account = account;
    this.index = index;
    this.ins = [];
    this.outs = [];
  }

  setTransactions(transactions: Transaction[]) {
    this.transactions = transactions;
  }

  setRawTransactions(rawTransactions: string) {
    this.rawTransactions = rawTransactions;
  }

  setBalance(balance: number) {
    this.balance = balance;
  }

  setStats(txsCount: number, fundedSum: number, spentSum: number) {
    this.stats = new Stats();
    this.stats.txsCount = txsCount;
    this.stats.funded = fundedSum;
    this.stats.spent = spentSum;
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

  getType() {
    return this.type;
  }

  getDerivation() {
    return {
      account: this.account,
      index: this.index
    }
  }

  getBalance() : number {
    return this.balance;
  }

  getStats() {
    return this.stats
  }

  getTransactions() {
    return this.transactions;
  }

  getRawTransactions() {
    return this.rawTransactions;
  }
}

export { Address }