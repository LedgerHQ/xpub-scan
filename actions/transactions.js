const { VERBOSE, BITCOIN_NETWORK, LITECOIN_NETWORK } = require('../settings')
const bitcoin = require('../coins/bitcoin')
const litecoin = require('../coins/litecoin')

function getStats(address) {
    switch(global.network) {
        case BITCOIN_NETWORK:
        bitcoin.getStats(address);
        break;
        case LITECOIN_NETWORK:
        litecoin.getStats(address);
        break;
    }
}

function getTransactions(address, ownAddresses) {
    preprocessTransactions(address);
    processFundedTransactions(address);
    processSentTransactions(address, ownAddresses);
}

// get and transform raw transactions associated with an address
// into an array of processed transactions
function preprocessTransactions(address) {
    switch(global.network) {
        case BITCOIN_NETWORK:
        bitcoin.getTransactions(address);
        break;
        case LITECOIN_NETWORK:
        litecoin.getTransactions(address);
        break;
    }
}

// process amounts received
function processFundedTransactions(address) {
    // if change address: no funded transactions
    if (address.getDerivation().account === 1) {
        address.setFunded([]);
        return;
    }
    
    const transactions = address.getTransactions();
    var funded = [];
    
    transactions.forEach(tx => {
        if (typeof(tx.ins) !== 'undefined' && tx.ins.length > 0) {
            funded.push({
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                time: tx.time,
                amount: tx.ins[0].value
            });
        }
    })
    
    address.setFunded(funded);
    
    if (VERBOSE) {
        console.log('FUNDED\t', address.getFunded());
    }
}

// process amounts sent to relevant addresses
function processSentTransactions(address, ownAddresses) {
    const transactions = address.getTransactions();
    const internalAddresses = ownAddresses.getInternalAddresses();
    const externalAddresses = ownAddresses.getExternalAddresses();

    var sent = [];
    
    for(var i = 0; i < transactions.length; ++i) {
        const tx = transactions[i];
        //const ins = tx.ins;
        const outs = tx.outs;
        const txid = tx.txid;
        
        outs.forEach(out => {
            // exclude internal (i.e. change) addresses
            if (!internalAddresses.includes(out.address)) {
                sent.push({
                    txid: txid,
                    blockHeight: tx.blockHeight,
                    time: tx.time,
                    amount: out.value,
                    self: externalAddresses.includes(out.address)
                });
            }
        })
    }
    
    address.setSent(sent);
    
    if (VERBOSE) {
        console.log('SENT\t', address.getSent());
    }
}

// Sort transactions by block time
// (reversed ordering)
function getSortedTransactions(...addresses) {
    var transactions = [], processedTxs = [];

    [].concat.apply([], addresses).forEach(address => {
  
        address.funded.forEach(tx => {
            transactions.push(
                {
                    address: address,
                    amount: tx.amount,
                    blockHeight: tx.blockHeight,
                    time: tx.time
                }
            );
        });
    
        address.sent.forEach(tx => {  
            // only process a given txid once
            if (!processedTxs.includes(tx.txid)) {
    
                transactions.push(
                    {
                        address: address,
                        amount: -1 * tx.amount, // make it a negative number
                        blockHeight: tx.blockHeight,
                        time: tx.time,
                        self: tx.self
                    }
                );
    
                processedTxs.push(tx.txid);
            }
        });
      
    });
  
    // reverse chronological order
    transactions = transactions.sort(function(a, b) {
      return b.time - a.time;
    });

    return transactions;
}

// eslint-disable-next-line no-unused-vars
function showTransactions(address) {
    console.dir(address.getTransactions(), { depth: null });
}

module.exports = { getStats, getTransactions, getSortedTransactions }