export enum OperationType {
    In,
    Out
}

// In or Out Operation
class Operation {
    type: OperationType;
    txid: string;
    date: string;
    block: number;
    address: string;
    amount: number;
    self: boolean;

    constructor(date: string, amount: number) {
        this.date = date;
        this.amount = amount;
        this.self = false;
    }

    setAsIn() {
        this.type = OperationType.In;

        // ensure that out operations have positive amounts
        if (this.amount < 0) {
            this.amount = -1 * this.amount;
        }
    }

    setAsOut() {
        this.type = OperationType.Out;

        // ensure that out operations have negative amounts
        if (this.amount > 0) {
            this.amount = -1 * this.amount;
        }
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