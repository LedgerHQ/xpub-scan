const display = require('../display');

const { Address, getAddress } = require('./address');
const { AddressType, MAX_EXPLORATION, ADDRESSES_PREGENERATION } = require('../settings');
const { getStats, getTransactions, getSortedTransactions } = require('./transactions')

const chalk = require('chalk');

// generate addresses associated with the xpub
function generateSampleOfDerivedAddresses(xpub) {
  display.transientLine(chalk.grey("pre-generating addresses..."));
  
  var external = [], internal = [];
  
  [
    AddressType.LEGACY,
    AddressType.SEGWIT,
    AddressType.NATIVE
  ]
  .forEach(addressType => {
    for(var index = 0; index < ADDRESSES_PREGENERATION; ++index) {
      external.push(getAddress(addressType, xpub, 0, index));
      internal.push(getAddress(addressType, xpub, 1, index));
    }
  });
  
  display.transientLine(/* delete line about addresses pre-generation */);
  
  return {
    external: external,
    internal: internal,
    all: internal.concat(external)
  };
}

function updateSummary(summary, addressType, value) {
  if(!summary.get(addressType)) {
    summary.set(addressType, value);
  }
  else {
    summary.get(addressType).balance += value.balance;
  }
}

function getLegacyOrSegWitStats(xpub, derivedAddresses) {
  const legacy = scanAddresses(AddressType.LEGACY, xpub, derivedAddresses);
  const segwit = scanAddresses(AddressType.SEGWIT, xpub, derivedAddresses);
  
  const totalBalance = legacy.balance + segwit.balance
  
  return {
    balance: totalBalance,
    addresses: legacy.addresses.concat(segwit.addresses)
  };
}

// scan all active addresses
function scanAddresses(addressType, xpub, derivedAddresses) {
  display.logStatus("Scanning ".concat(chalk.bold(addressType)).concat(" addresses..."));
  
  var totalBalance = 0, noTxCounter = 0;
  var addresses = []
  
  for(var account = 0; account < 2; ++account) {
    const typeAccount = account === 0 ? "external" : "internal";
    
    display.logStatus("- scanning " + chalk.italic(typeAccount) + " addresses -");
    
    noTxCounter = 0;
    
    for(var index = 0; index < 1000; ++index) {
      const address = new Address(addressType, xpub, account, index)
      display.updateAddressDetails(address);
      
      const status = noTxCounter === 0 ? "analyzing" : "probing address gap"
      process.stdout.write(chalk.yellow(status + "..."));
      
      getStats(address);
      
      const addressStats = address.getStats();
      
      // here, evaluate if the address needs further analysis
      
      if (addressStats.txs_count === 0) {
        noTxCounter++;
        display.transientLine(/* delete address */);
        
        if (account === 1 || noTxCounter >= MAX_EXPLORATION) {
          // TODO?: extend logic to account numbers > 1
          display.transientLine(/* delete last probing info */);
          display.logStatus("- " + chalk.italic(typeAccount) + " addresses scanned -");
          break;
        }
        
        continue;
      }
      else {
        noTxCounter = 0;
      }
      
      // if the address is an active one, fetch its transactions
      // (note: with the current implementation, this is done in
      //  _getStats_ function, called above, but in the future,
      //  the API may change and require two different requests.
      //  Therefore, this call to _getTransactions_ would then
      //  be justified).
      getTransactions(address, derivedAddresses);
      
      totalBalance += address.getBalance();
      
      const tx = {
        funded: {
          count: addressStats.funded.count,
          sum: addressStats.funded.sum,
        },
        spent: {
          count: addressStats.spent.count,
          sum: addressStats.spent.sum,
        },
        txsCount: addressStats.txs_count
      };
      
      display.updateAddressDetails(address);
      
      address.setStats(tx);
      
      addresses.push(address)      
    }
  }
  
  display.logStatus(addressType.concat(" addresses scanned\n"));
  
  return {
    balance: totalBalance,
    addresses: addresses
  }
}


function run(xpub, account, index) {
  
  var summary = new Map();
  
  if (typeof(account) === 'undefined') {
    // Option A: no index has been provided:
    //  - retrieve stats for legacy/SegWit
    //  - scan Native SegWit addresses
    
    console.log(chalk.bold("\nActive addresses\n"))
    
    // a _meaningful_ sample of addresses derived from the xpub has 
    // to be generated (once) to perform analysis of the transactions
    const derivedAddresses = generateSampleOfDerivedAddresses(xpub);
    
    const legacyOrSegwit = getLegacyOrSegWitStats(xpub, derivedAddresses);
    updateSummary(summary, AddressType.LEGACY_OR_SEGWIT, legacyOrSegwit);
    
    const nativeSegwit = scanAddresses(AddressType.NATIVE, xpub, derivedAddresses);
    updateSummary(summary, AddressType.NATIVE, nativeSegwit);
    
    const sortedAddresses = getSortedTransactions(legacyOrSegwit.addresses, nativeSegwit.addresses);
    
    display.displayTransactions(sortedAddresses)
  }
  else {
    // Option B: an index has been provided:
    // derive all addresses at that account and index; then
    // check their respective balances
    [
      AddressType.LEGACY,
      AddressType.SEGWIT,
      AddressType.NATIVE
    ].forEach(addressType => {
      const address = new Address(addressType, xpub, account, index);
      
      display.updateAddressDetails(address);
      
      getStats(address);
      
      display.updateAddressDetails(address);
      
      updateSummary(summary, addressType, address);
    })
  }
  
  console.log(chalk.bold("\nSummary\n"));
  
  for (var [addressType, value] of summary.entries()) {
    display.showSummary(addressType, value);
  }
}

module.exports = { run }