type OperationType = 
            "Received"                              // Received - common case
        |   "Received (non-sibling to change)"      // Received - edge case: address not belonging to the xpub
                                                    //                       sending funds to change address 

        |   "Sent"                                  // Sent - common case
        |   "Sent to self"                          // Sent - edge case 1: The recipient is the sender (identity)
        |   "Sent to sibling"                       // Sent - edge case 2: recipient belongs to same xpub ("sibling")

class Operation {
    operationType: OperationType;
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
        this.operationType = operationType;
    }

    getType() {
        return this.operationType
    }
}

export { Operation, OperationType }
