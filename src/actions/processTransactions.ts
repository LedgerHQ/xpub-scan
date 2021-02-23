import { VERBOSE, BITCOIN_NETWORK, LITECOIN_NETWORK, configuration } from "../settings";
import { Address } from "../models/address"
import { OwnAddresses } from "../models/ownAddresses"
import { Operation } from "../models/operation"

import * as defaultProvider from "../api/defaultProvider";
import * as customProvider from "../api/customProvider";

function getStats(address: Address) {
    const network = configuration.network;

    switch(configuration.providerType) {
        case 'default':
            if (network === BITCOIN_NETWORK) {
                defaultProvider.getStats(address, 'BTC');
            }
            else if (network === LITECOIN_NETWORK) {
                defaultProvider.getStats(address, 'LTC');
            }
            break;

        case 'custom':
            if (network === BITCOIN_NETWORK) {
                customProvider.getStats(address, 'btc');
            }
            else if (network === LITECOIN_NETWORK) {
                customProvider.getStats(address, 'ltc');
            }
            break;

        default:
            throw new Error("Should not be reachable: providerType should be 'default' or 'custom'");
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
    const network = configuration.network;

    switch(configuration.providerType) {
        case 'default':
            defaultProvider.getTransactions(address);
            break;

        case 'custom':
            if (network === BITCOIN_NETWORK) {
                customProvider.getTransactions(address, 'btc');
            }
            else if (network === LITECOIN_NETWORK) {
                customProvider.getTransactions(address, 'ltc');
            }
            break;

        default:
            throw new Error("Should not be reachable: providerType should be 'default' or 'custom'");
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
        
        outs.forEach(out => {
            // exclude internal (i.e. change) addresses
            if (!internalAddresses.includes(out.address)) {
                const op = new Operation(tx.date, out.amount);
                op.setTxid(tx.txid);

                // self sent: sent to an address belonging to the same xpub
                // while not being a change address
                op.setSibling(externalAddresses.includes(out.address));
                op.setSelf(out.address === address.toString());

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

// Sort transactions by date
// (reverse chronological order)
function getSortedOperations(...addresses: any) : Operation[] {
    let operations: Operation[] = [];
    let processedTxids: string[]= [];

    // flatten the array of arrays in one dimension, and iterate
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