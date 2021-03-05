
// In or Out Operation,
// part of a Transaction

export enum OperationType {
    In,
    InChange, // change address having received funds from a non-sibling address
    Out,
    Out_Self,
    Out_Sibling
}

class Operation {
    type: OperationType;
    txid: string;
    date: string;
    block: number;
    address: string;
    amount: number;

    // self sent (sent to same address)
    self: boolean; 

    // sent to non-change address belonging to same xpub
    sentToSibling: boolean;

    constructor(date: string, amount: number) {
        this.date = date;
        this.amount = amount;
        this.self = false;
        this.sentToSibling=false;
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

    setType(operationType: OperationType) {
        this.type = operationType;
    }

    getType() {
        return this.type
    }
}

export { Operation }
