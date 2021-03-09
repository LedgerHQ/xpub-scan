import chalk from "chalk";

import * as display from "../display";

import { Address } from "../models/address"
import { OwnAddresses } from "../models/ownAddresses"
import { AddressType, MAX_EXPLORATION } from "../settings";
import { getStats, getTransactions } from "./processTransactions";


// scan all active addresses
// (that is: balances with > 0 transactions)
function scanAddresses(addressType: AddressType, xpub: string) {
  display.logStatus("Scanning ".concat(chalk.bold(addressType)).concat(" addresses..."));

  let ownAddresses = new OwnAddresses();
  
  let totalBalance = 0;
  let noTxCounter = 0;
  const addresses: Address[] = []
  
  // TODO: should we limit ourselves to account 0 and 1?
  // if not, use a logic similar to indices exploration
  for (let account = 0; account < 2; ++account) {
    const typeAccount = account === 1 ? "internal" : "external";
    
    display.logStatus("- scanning " + chalk.italic(typeAccount) + " addresses -");
    
    noTxCounter = 0;
    
    for (let index = 0; /* scan all active indices */ ; ++index) {
      const address = new Address(addressType, xpub, account, index)
      display.updateAddressDetails(address);
      
      const status = noTxCounter === 0 ? "analyzing" : "probing address gap"
      process.stdout.write(chalk.yellow(status + "..."));
      
      getStats(address);
      
      const addressStats = address.getStats();
      
      // here, evaluate if the address needs further analysis
      
      if (addressStats.txsCount === 0) {
        // if no transaction, perform address gap probing if exploration
        // limit no reached yet
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
      
      // important step: add the active address to the
      // list of own addresses in order to perform
      // transaction analysis further down the flow
      ownAddresses.addAddress(address);

      addresses.push(address);
    }
  }
  
  // process transactions
  display.transientLine(chalk.yellowBright('Processing transactions...'));
  addresses.forEach(address => {
    getTransactions(address, ownAddresses);
  });
  display.transientLine(/* delete address */);

  display.logStatus(addressType.concat(" addresses scanned\n"));
  
  return {
    balance: totalBalance,
    addresses: addresses
  }
}

function run(xpub: string, account?: number, index?: number) {  
  let activeAddresses: Address[] = [];
  let summary: any[] = [];
  
  if (typeof(account) === 'undefined') {
    // Option A: no index has been provided:
    // scan all address types

    console.log(chalk.bold("\nActive addresses\n"));

    [
      AddressType.LEGACY,
      AddressType.SEGWIT,
      AddressType.NATIVE
    ].forEach(addressType => {
      const results = scanAddresses(addressType, xpub);
      
      activeAddresses = activeAddresses.concat(results.addresses);

      summary.push({
        type: addressType, 
        balance: results.balance
      });
    });
    
  }
  else {
    // Option B: an account number and index has been provided:
    // derive all addresses at that account and index; then
    // check their respective balances
    let ownAddresses = new OwnAddresses();

    [
      AddressType.LEGACY,
      AddressType.SEGWIT,
      AddressType.NATIVE
    ].forEach(addressType => {
      const address = new Address(addressType, xpub, account, (index || 0));
      
      display.updateAddressDetails(address);
      
      getStats(address);
      
      display.updateAddressDetails(address);

      if (address.getStats().txsCount !== 0) {
        getTransactions(address, ownAddresses);
      }

      activeAddresses = activeAddresses.concat(address);
      
      summary.push({
        type: addressType, 
        balance: address.getBalance()
      });
    })
  }

  return {
    addresses: activeAddresses,
    summary: summary
  }
}

export { run }
