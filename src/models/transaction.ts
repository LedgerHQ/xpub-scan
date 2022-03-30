import { Operation } from "./operation";

class Transaction {
  blockHeight: number;
  date: string;
  txid: string;
  ins: Array<Operation>;
  outs: Array<Operation>;

  constructor(
    block: number,
    date: string,
    txid: string,
    ins: Array<Operation>,
    outs: Array<Operation>,
  ) {
    this.blockHeight = block;
    this.date = date;
    this.txid = txid;
    this.ins = ins;
    this.outs = outs;
  }
}

export { Transaction };
