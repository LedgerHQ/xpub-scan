import { VERBOSE, BITCOIN_NETWORK, LITECOIN_NETWORK, configuration } from "../settings";
import { Address } from "../models/address"
import { OwnAddresses } from "../models/ownAddresses"
import { Operation, OperationType } from "../models/operation"

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
    processFundedTransactions(address, ownAddresses);
    processSentTransactions(address, ownAddresses);
}

// get and transform raw transactions associated with an address
// into an array of processed transactions
function preprocessTransactions(address: Address) {
    switch(configuration.providerType) {
        case 'default':
            defaultProvider.getTransactions(address);
            break;

        case 'custom':
            customProvider.getTransactions(address);
            break;

        default:
            throw new Error("Should not be reachable: providerType should be 'default' or 'custom'");
    }
}

// process amounts received
function processFundedTransactions(address: Address, ownAddresses: OwnAddresses) {

    const transactions = address.getTransactions();
    const allOwnAddresses = ownAddresses.getAllAddress();
    const accountNumber = address.getDerivation().account;
    
    for (const tx of transactions) {
        if (typeof(tx.ins) !== 'undefined' && tx.ins.length > 0) {

            // if account is internal (i.e., 1), and
            //     - has a sibling as sender: return (expected behavior: sent to change)
            //     - has no sibling as sender: process the operation (edge case: non-sibling to change)
            if (accountNumber === 1) {
                for (let txin of tx.ins) {
                    if (allOwnAddresses.includes(txin.address)) {
                        return;
                    }
                }
            }
                
            const op = new Operation(tx.date, tx.ins[0].amount);
            op.setTxid(tx.txid);
            op.setBlockNumber(tx.blockHeight);
            op.setType(accountNumber !== 1 ? OperationType.In : OperationType.InChange)
    
            address.addFundedOperation(op);
        }
    }
        
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

                if (out.address === address.toString()) {
                    // sent to self: sent to same address
                    op.setType(OperationType.Out_Self);
                }
                else if (externalAddresses.includes(out.address)) {
                    // sent to a sibling: sent to an address belonging to the same xpub
                    // while not being a change address
                    op.setType(OperationType.Out_Sibling);
                }
                else {
                    op.setType(OperationType.Out);
                }

                op.setBlockNumber(tx.blockHeight);

                address.addSentOperation(op);
            }
        })
    }
    
    
    if (VERBOSE) {
        console.log('SENT\t', address.getSpentOperations());
    }
}

// sort by block number and, _then, if needed_, by date
function compareOpsByBlockThenDate(A: Operation, B: Operation){
    // block number
    if (A.block > B.block) {
        return -1;
    }

    if (A.block < B.block) {
        return 1;
    }

    // date
    if (A.date > B.date) {
        return -1;
    }

    if (A.date < B.date) {
        return 1;
    }

    return 0;
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
    operations.sort(compareOpsByBlockThenDate);

    return operations;
}

// eslint-disable-next-line no-unused-vars
function showTransactions(address: Address) {
    console.dir(address.getTransactions(), { depth: null });
}

export { getStats, getTransactions, getSortedOperations }
