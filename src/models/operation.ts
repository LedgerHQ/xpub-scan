type OperationType = 
            "Received"
        |   "Received (non-sibling to change)"
        |   "Sent"
        |   "Sent to self"
        |   "Sent to sibling"

class Operation {
    type: OperationType;
    txid: string;
    date: string;
    block: number;
    address: string;
    amount: number;

    constructor(date: string, amount: number) {
        this.date = date;
        this.amount = amount;
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

export { Operation, OperationType }
