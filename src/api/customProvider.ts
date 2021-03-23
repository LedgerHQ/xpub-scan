import dateFormat from "dateformat";

import * as helpers from "../helpers";
import { configuration } from "../settings";
import { Address } from "../models/address";
import { Transaction } from "../models/transaction";
import { Operation } from "../models/operation";

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
function getStats(address: Address, coinDenomination: string) {
    const url = configuration.customAPI!
                .replace('{coin}', coinDenomination)
                .replace('{address}', address.toString());
                
    const res = helpers.getJSON(url, configuration.APIKey);
    
    // TODO: check potential errors here (API returning invalid data...)
    const fundedSum = parseFloat(res.payload.totalReceived);
    const spentSum = parseFloat(res.payload.totalSpent);
    const balance = parseFloat(res.payload.balance);

    address.setStats(res.payload.txsCount, fundedSum, spentSum);
    address.setBalance(balance);

    if (res.payload.txsCount > 0) {
        const getTxsURLTemplate = configuration.customAPI!
            .replace('{coin}', coinDenomination)
            .replace('{address}', address.toString())
            .concat('/transactions?index={index}&limit={limit}')

        // to handle large number of transactions by address, use the index+limit logic
        // offered by the custom provider
        const payloads = [];
        let index = 0;
        for (let limit = 100; /* continue until txs count is reached */; limit += 100) {

            const getTxsURL = getTxsURLTemplate
                .replace('{index}', String(index))
                .replace('{limit}', String(limit));

            const txs = helpers.getJSON(getTxsURL, configuration.APIKey);
            const payload = txs.payload;
            const txsCount = txs.meta.totalCount;

            payloads.push(payload);

            // when the limit includes the total number of transactions,
            // no need to go further
            if (limit > txsCount || payload.length === 0) {
                break;
            }

            index += limit;
        }

        // flatten the payloads
        const rawTransactions = [].concat.apply([], payloads);

        address.setRawTransactions(JSON.stringify(rawTransactions));
    }
}

// transforms raw transactions associated with an address
// into an array of processed transactions:
// [ { blockHeight, txid, ins: [ { address, value }... ], outs: [ { address, value }...] } ]
function getTransactions(address: Address) {
    const rawTransactions = JSON.parse(address.getRawTransactions());
    const transactions: Transaction[] = [];
    
    rawTransactions.forEach( (tx: RawTransaction) => {
        const ins: Operation[] = [];
        const outs: Operation[] = [];
        let amount = 0.0;
        let processIn: boolean = false;
        let processOut: boolean = false;

        // 1. Detect operation type
        for (const txin of tx.txins) {
            for (const inAddress of txin.addresses) {
                if (inAddress.includes(address.toString())) {
                    processOut = true;
                    break;
                }
            }
        }

        for (const txout of tx.txouts) {
            for (const outAddress of txout.addresses) {
                if (outAddress.includes(address.toString())) {
                    // when IN op, amount corresponds to txout
                    amount = parseFloat(txout.amount); 
                    processIn = true;
                    break;
                }
            }
        }
        
        // 2. Process operations
        if (processIn) {
            tx.txins.forEach(txin => {
                txin.addresses.forEach(inAddress => {
                    const op = new Operation(String(tx.timestamp), amount);
                    op.setAddress(inAddress);
                    op.setTxid(tx.txid);
                    op.setType("Received")
    
                    ins.push(op);
                })
            })
        } 
       
        if (processOut) {
            tx.txouts.forEach(txout => {  
                txout.addresses.forEach(outAddress => {
                    const op = new Operation(String(tx.timestamp), parseFloat(txout.amount));
                    op.setAddress(outAddress);
                    op.setTxid(tx.txid);
                    op.setType("Sent")
    
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
