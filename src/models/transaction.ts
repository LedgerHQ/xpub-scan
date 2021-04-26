import { Operation } from "./operation";

class Transaction {
    blockHeight: number;
    date: string;
    txid: string;
    ins: Operation[];
    outs: Operation[];

    constructor(block: number, date: string, txid: string, ins: Operation[], outs: Operation[]) {
        this.blockHeight = block;
        this.date = date;
        this.txid = txid;
        this.ins = ins;
        this.outs = outs;
    }
}

export { Transaction };
