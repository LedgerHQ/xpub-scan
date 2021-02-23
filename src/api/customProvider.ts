import dateFormat from "dateformat";

import * as helpers from "../helpers";
import { configuration } from "../settings";
import { Address } from "../models/address";
import { Transaction } from "../models/transaction";
import { OperationType, Operation } from "../models/operation";

interface RawTransaction {
    txid: string;
    blockheight: number;
    confirmations: number;
    timestamp: number;
    amount: string;
    fees: string;
    txins: {
        amount: string;
        addresses: string[];
    }[];
    txouts: {
        amount: string;
        addresses: string[];
    }[];
}

// returns the basic stats related to an address:
// its balance, funded and spend sums and counts
function getStats(address: Address, coin: string) {
    const url = configuration.BaseURL
                .replace('{coin}', coin)
                .replace('{address}', address.toString());
                
    const res = helpers.getJSON(url, configuration.APIKey);
    
    // TODO: check potential errors here (API returning invalid data...)
    const fundedSum = parseFloat(res.payload.totalReceived);
    const spentSum = parseFloat(res.payload.totalSpent);
    const balance = parseFloat(res.payload.balance);

    address.setStats(res.payload.txsCount, fundedSum, spentSum);
    address.setBalance(balance);

    if (res.payload.txsCount > 0) {
        const getTxsURL = configuration.BaseURL
            .replace('{coin}', coin)
            .replace('{address}', address.toString())
            .concat('/transactions?index=0&limit=1000');

        const rawTransactions = helpers.getJSON(getTxsURL, configuration.APIKey);

        address.setRawTransactions(JSON.stringify(rawTransactions));
    }
}

// transforms raw transactions associated with an address
// into an array of processed transactions:
// [ { blockHeight, txid, ins: [ { address, value }... ], outs: [ { address, value }...] } ]
function getTransactions(address: Address, coin: string) {
    const rawTransactions = JSON.parse(address.getRawTransactions());

    const transactions: Transaction[] = [];
    
    rawTransactions.payload.forEach( (tx: RawTransaction) => {
        const ins: Operation[] = [];
        const outs: Operation[] = [];
        let operationType: OperationType = OperationType.In;
        let amount = 0.0;

        // 1. Detect operation type
        tx.txins.forEach(txin => {
            txin.addresses.forEach(inAddress => {
                if (inAddress === address.toString()) {
                    operationType = OperationType.Out;
                }
            });
        });

        tx.txouts.forEach(txout => {  
            txout.addresses.forEach(outAddress => {
                if (outAddress === address.toString()) {
                    operationType = OperationType.In;
                    // when in op, amount correspond to txout
                    amount = parseFloat(txout.amount); 
                }
            });
        });
        
        if (operationType === OperationType.In) {   
            tx.txins.forEach(txin => {
                txin.addresses.forEach(inAddress => {
                    const op = new Operation(String(tx.timestamp), amount);
                    op.setAddress(inAddress);
                    op.setTxid(tx.txid);
                    op.setAsIn();
    
                    ins.push(op);
                })
            })
        } 
        else {
            tx.txouts.forEach(txout => {  
                txout.addresses.forEach(outAddress => {
                    const op = new Operation(String(tx.timestamp), parseFloat(txout.amount));
                    op.setAddress(outAddress);
                    op.setTxid(tx.txid);
                    op.setAsOut();
    
                    outs.push(op);
                })
            })
        }

        transactions.push(
            new Transaction(
                    tx.blockheight,
                    String(
                        dateFormat(new Date(tx.timestamp * 1000), "yyyy-mm-dd HH:MM:ss")
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