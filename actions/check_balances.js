const display = require('../display');

const { Address, OwnAddresses } = require('./address');
const { AddressType, MAX_EXPLORATION } = require('../settings');
const { getStats, getTransactions, getSortedTransactions } = require('./transactions')

const chalk = require('chalk');

function updateSummary(summary, addressType, value) {
  if(!summary.get(addressType)) {
    summary.set(addressType, value);
  }
  else {
    summary.get(addressType).balance += value.balance;
  }
}

// scan all active addresses
function scanAddresses(addressType, xpub) {
  display.logStatus("Scanning ".concat(chalk.bold(addressType)).concat(" addresses..."));

  var ownAddresses = new OwnAddresses(addressType);
  
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
      
      totalBalance += address.getBalance();
      
      display.updateAddressDetails(address);
      
      ownAddresses.addAddress(address);

      addresses.push(address);
    }
  }
  
  // process transactions
  addresses.forEach(address => {
    getTransactions(address, ownAddresses);
  });

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
    
    const legacy = scanAddresses(AddressType.LEGACY, xpub);
    updateSummary(summary, AddressType.LEGACY, legacy);

    const segwit = scanAddresses(AddressType.SEGWIT, xpub);
    updateSummary(summary, AddressType.SEGWIT, segwit);
    
    const nativeSegwit = scanAddresses(AddressType.NATIVE, xpub);
    updateSummary(summary, AddressType.NATIVE, nativeSegwit);
    
    const sortedAddresses = getSortedTransactions(
      legacy.addresses, 
      segwit.addresses, 
      nativeSegwit.addresses
    );
    
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