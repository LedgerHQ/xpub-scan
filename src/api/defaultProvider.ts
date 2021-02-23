import dateFormat from "dateformat";

import * as helpers from "../helpers";
import { configuration } from "../settings";
import { Address } from "../models/address";
import { Transaction } from "../models/transaction";
import { Operation, OperationType } from "../models/operation";

interface RawTransaction {
    txid: string;
    block_no: number;
    confirmations: number;
    time: number;
    incoming: {
        value: string;
        inputs: {
            address: string;
        }[];
    };
    outgoing: {
        value: string;
        outputs: {
            address: string;
            value: string;
        }[];
    };
}

// returns the basic stats related to an address:
// its balance, funded and spend sums and counts
function getStats(address: Address, coin: string) {
    const url = configuration.BaseURL
                .replace('{coin}', coin)
                .replace('{address}', address.toString());

    const res = helpers.getJSON(url);
    
    // TODO: check potential errors here (API returning invalid data...)
    const fundedSum = parseFloat(res.data.received_value);
    const balance = parseFloat(res.data.balance);
    const spentSum = fundedSum - balance;
    
    address.setStats(res.data.total_txs, fundedSum, spentSum);
    address.setBalance(balance);

    address.setRawTransactions(JSON.stringify(res.data.txs));
}

// transforms raw transactions associated with an address
// into an array of processed transactions:
// [ { blockHeight, txid, ins: [ { address, value }... ], outs: [ { address, value }...] } ]
function getTransactions(address: Address) {
    // 1. get raw transactions
    const rawTransactions = JSON.parse(address.getRawTransactions());
    
    // 2. parse raw transactions
    let transactions: Transaction[] = [];
    
    rawTransactions.forEach( (tx: RawTransaction) => {
        let ins: Operation[] = [];
        let outs: Operation[] = [];
        
        if (typeof(tx.incoming) !== 'undefined') {   
            tx.incoming.inputs.forEach(txin => {
                const op = new Operation(String(tx.time), parseFloat(tx.incoming.value));
                op.setAddress(txin.address);
                op.setTxid(tx.txid);
                op.setType(OperationType.In)

                ins.push(op);
            })
        }
        
        if (typeof(tx.outgoing) !== 'undefined') {
            tx.outgoing.outputs.forEach(txout => {  
                const op = new Operation(String(tx.time), parseFloat(txout.value));
                op.setAddress(txout.address);
                op.setTxid(tx.txid);
                op.setType(OperationType.Out)

                outs.push(op);
            })
        }

        transactions.push(
            new Transaction(
                    tx.block_no,
                    String(
                        dateFormat(new Date(tx.time * 1000), "yyyy-mm-dd HH:MM:ss")
                        ), // unix time to readable format
                    tx.txid,
                    ins,
                    outs
                )
        )
        
    });

    address.setTransactions(transactions);
}

export { getStats, getTransactions }
