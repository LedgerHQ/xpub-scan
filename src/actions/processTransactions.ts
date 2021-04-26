import { VERBOSE, configuration, NETWORKS } from "../settings";
import { Address } from "../models/address";
import { OwnAddresses } from "../models/ownAddresses";
import { Operation } from "../models/operation";

import * as defaultProvider from "../api/defaultProvider";
import * as customProvider from "../api/customProvider";

function getStats(address: Address) {
    switch(configuration.providerType) {
        case "default":
            defaultProvider.getStats(address, configuration.symbol.toUpperCase());
            break;

        case "custom":
            customProvider.getStats(address, configuration.symbol.toLowerCase());
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
        case "default":
            defaultProvider.getTransactions(address);
            break;

        case "custom":
            customProvider.getTransactions(address);
            break;

        default:
            throw new Error("Should not be reachable: providerType should be 'default' or 'custom'");
    }
}

// process amounts received
function processFundedTransactions(address: Address, ownAddresses: OwnAddresses) {

    const transactions = address.getTransactions();
    const allOwnAddresses = ownAddresses.getAllAddresses();
    const accountNumber = address.getDerivation().account;
    let isFunded: boolean;

    for (const tx of transactions) {
        isFunded = true;
        if (typeof(tx.ins) !== "undefined" && tx.ins.length > 0) {

            // if account is internal (i.e., 1), and
            //     - has a sibling as sender: not externally funded (expected behavior: sent to change)
            //     - has no sibling as sender: process the operation (edge case: non-sibling to change)
            if (accountNumber === 1) {
                for (const txin of tx.ins) {
                    if (allOwnAddresses.includes(txin.address)) {
                        isFunded = false;
                        break;
                    }
                }
            }

            if (isFunded) {
                const op = new Operation(tx.date, tx.ins[0].amount);
                op.setTxid(tx.txid);
                op.setBlockNumber(tx.blockHeight);
                op.setType(accountNumber !== 1 ? "Received" : "Received (non-sibling to change)");
        
                address.addFundedOperation(op);
            }
        }
    }
        
    if (VERBOSE) {
        console.log("FUNDED\t", address.getFundedOperations());
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
                    op.setType("Sent to self");
                }
                else if (externalAddresses.includes(out.address)) {
                    // sent to a sibling: sent to an address belonging to the same xpub
                    // while not being a change address
                    op.setType("Sent to sibling");
                }
                else {
                    op.setType("Sent");
                }

                op.setBlockNumber(tx.blockHeight);

                address.addSentOperation(op);
            }
        });
    }
    
    
    if (VERBOSE) {
        console.log("SENT\t", address.getSpentOperations());
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
    const operations: Operation[] = [];
    const processedTxids: string[]= [];

    // flatten the array of arrays in one dimension, and iterate
    [].concat.apply([], addresses).forEach( (address: Address) => {
  
        address.getFundedOperations().forEach( (op: Operation) => {
            op.setAddress(address.toString());

            if (configuration.symbol === "BCH") {
                op.setCashAddress(address.asCashAddress());
            }

            operations.push(op);
        });
    
        address.getSpentOperations().forEach( (op: Operation) => {  
            // only process a given txid once
            if (!processedTxids.includes(op.txid)) {
                op.setAddress(address.toString());

                if (configuration.symbol === "BCH") {
                    op.setCashAddress(address.asCashAddress());
                }

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

export { getStats, getTransactions, getSortedOperations };
