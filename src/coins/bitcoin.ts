import dateFormat from "dateformat";

import * as helpers from "../helpers";
import { BITCOIN_API } from "../settings";
import { Address } from "../models/address";
import { Transaction } from "../models/transaction";
import { Operation } from "../models/operation";

interface RawTransaction {
    txid: string;
    block_no: number;
    confirmations: number;
    time: number;
    incoming: {
        value: string;
        inputs: Array<{
            address: string;
        }>;
    };
    outgoing: {
        value: string;
        outputs: Array<{
            address: string;
            value: string;
        }>
    };
}

// Note: Bitcoin and Litecoin are currently identically implemented
//       because they are using the same API.
//       However, in the future this may change. Therefore, each coin
//       should have its own implementation.

// returns the basic stats related to an address:
// its balance, funded and spend sums and counts
function getStats(address: Address) {
    const url = BITCOIN_API.concat(address.toString());
    const res = helpers.getJSON(url);
    
    const funded_sum = parseFloat(res.data.received_value);
    const balance = parseFloat(res.data.balance);
    const spent_sum = funded_sum - balance;
    
    address.setStats(res.data.total_txs, funded_sum, spent_sum);
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
            tx.incoming.inputs.forEach(vin => {
                const op = new Operation(String(tx.time), parseFloat(tx.incoming.value) * -1);
                op.setAddress(vin.address);
                op.setTxid(tx.txid);
                op.setAsIn();

                ins.push(op);
            })
        }
        
        if (typeof(tx.outgoing) !== 'undefined') {
            tx.outgoing.outputs.forEach(vout => {  
                const op = new Operation(String(tx.time), parseFloat(vout.value));
                op.setAddress(vout.address);
                op.setTxid(tx.txid);
                op.setAsOut();

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