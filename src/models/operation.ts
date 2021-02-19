
// In or Out Operation,
// part of a Transaction

export enum OperationType {
    In,
    Out
}

class Operation {
    type: OperationType;
    txid: string;
    date: string;
    block: number;
    address: string;
    amount: number;

    // self sent (sent to non-change address belonging to same xpub)
    self: boolean; 

    constructor(date: string, amount: number) {
        this.date = date;
        this.amount = amount;
        this.self = false;
    }

    setAsIn() {
        this.type = OperationType.In;
    }

    setAsOut() {
        this.type = OperationType.Out;
    }

    setTxid(txid: string) {
        this.txid = txid; // txid to which it belongs
    }

    getTxid() {
        return this.txid;
    }

    setBlockNumber(blockNumber: number) {
        this.block = blockNumber;
    }

    getBlockNumber() {
        return this.block;
    }

    setAddress(address: string) {
        this.address = address;
    }

    getAddress() {
        return this.address;
    }

    setSelf(selfStatus: boolean) {
        this.self = selfStatus;
    }

    isSelf() {
        return this.self;
    }
}

export { Operation }