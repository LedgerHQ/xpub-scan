import { VERBOSE, BITCOIN_NETWORK, LITECOIN_NETWORK, network } from "../settings";
import { Address } from "../models/address"
import { OwnAddresses } from "../models/ownAddresses"
import { Operation } from "../models/operation"

import * as bitcoin from "../coins/bitcoin";
import * as litecoin from "../coins/litecoin";

function getStats(address: Address) {
    switch(network.type) {
        case BITCOIN_NETWORK:
            bitcoin.getStats(address);
            break;
        case LITECOIN_NETWORK:
            litecoin.getStats(address);
            break;
    }
}

function getTransactions(address: Address, ownAddresses: OwnAddresses) {
    preprocessTransactions(address);
    processFundedTransactions(address);
    processSentTransactions(address, ownAddresses);
}

// get and transform raw transactions associated with an address
// into an array of processed transactions
function preprocessTransactions(address: Address) {
    switch(network.type) {
        case BITCOIN_NETWORK:
            bitcoin.getTransactions(address);
            break;
        case LITECOIN_NETWORK:
            litecoin.getTransactions(address);
            break;
    }
}

// process amounts received
function processFundedTransactions(address: Address) {
    // if change address: no funded transactions
    if (address.getDerivation().account === 1) {
        return;
    }
    
    const transactions = address.getTransactions();
    
    transactions.forEach(tx => {
        if (typeof(tx.ins) !== 'undefined' && tx.ins.length > 0) {
            const op = new Operation(tx.date, tx.ins[0].amount);
            op.setTxid(tx.txid);
            op.setBlockNumber(tx.blockHeight);
            op.setAsIn();

            address.addFundedOperation(op);
        }
    })
        
    if (VERBOSE) {
        console.log('FUNDED\t', address.getFundedOperations());
    }
}

// process amounts sent to relevant addresses
function processSentTransactions(address: Address, ownAddresses: OwnAddresses) {
    const transactions = address.getTransactions();
    const internalAddresses = ownAddresses.getInternalAddresses();
    const externalAddresses = ownAddresses.getExternalAddresses();
    
    for(const tx of transactions) {
        const outs = tx.outs;
        // const txid = tx.txid;
        
        outs.forEach(out => {
            // exclude internal (i.e. change) addresses
            if (!internalAddresses.includes(out.address)) {
                const op = new Operation(tx.date, out.amount);
                op.setTxid(tx.txid);
                op.setSelf(externalAddresses.includes(out.address));
                op.setBlockNumber(tx.blockHeight);
                op.setAsOut();

                address.addSentOperation(op);
            }
        })
    }
    
    
    if (VERBOSE) {
        console.log('SENT\t', address.getSpentOperations());
    }
}

// Sort transactions by block time
// (reversed ordering)
function getSortedOperations(...addresses: any) : Operation[] {
    let operations: Operation[] = [];
    let processedTxids: string[]= [];

    [].concat.apply([], addresses).forEach( (address: Address) => {
  
        address.getFundedOperations().forEach( (op: Operation) => {
            op.setAddress(address.toString())
            operations.push(op);
        });
    
        address.getSpentOperations().forEach( (op: Operation) => {  
            // only process a given txid once
            if (!processedTxids.includes(op.txid)) {
                op.setAddress(address.toString())
                operations.push(op);
                processedTxids.push(op.txid);
            }
        });
      
    });
  
    // reverse chronological order
    operations.sort((a, b) => a.date > b.date ? -1 : a.date < b.date ? 1 : 0);

    return operations;
}

// eslint-disable-next-line no-unused-vars
function showTransactions(address: Address) {
    console.dir(address.getTransactions(), { depth: null });
}

export { getStats, getTransactions, getSortedOperations }