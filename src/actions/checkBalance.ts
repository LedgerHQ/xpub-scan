import * as display from "../display";

import { Address } from "../models/address"
import { OwnAddresses } from "../models/ownAddresses"
import { Operation } from "../models/operation"
import { AddressType, MAX_EXPLORATION } from "../settings";
import { getStats, getTransactions, getSortedOperations } from "./processTransactions";

import chalk from "chalk";

// scan all active addresses
function scanAddresses(addressType: AddressType, xpub: string) {
  display.logStatus("Scanning ".concat(chalk.bold(addressType)).concat(" addresses..."));

  let ownAddresses = new OwnAddresses();
  
  let totalBalance = 0, noTxCounter = 0;
  let addresses = []
  
  for(let account = 0; account < 2; ++account) {
    const typeAccount = account === 0 ? "external" : "internal";
    
    display.logStatus("- scanning " + chalk.italic(typeAccount) + " addresses -");
    
    noTxCounter = 0;
    
    for(let index = 0; index < 1000; ++index) {
      const address = new Address(addressType, xpub, account, index)
      display.updateAddressDetails(address);
      
      const status = noTxCounter === 0 ? "analyzing" : "probing address gap"
      process.stdout.write(chalk.yellow(status + "..."));
      
      getStats(address);
      
      const addressStats = address.getStats();
      
      // here, evaluate if the address needs further analysis
      
      if (addressStats.txsCount === 0) {
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

function run(xpub: string, account?: number, index?: number) : Operation[] {  
  let summary = new Map<string, number>();
  let operations: Operation[] = [];
  
  if (typeof(account) === 'undefined') {
    // Option A: no index has been provided:
    //  - retrieve stats for legacy/SegWit
    //  - scan Native SegWit addresses
    console.log(chalk.bold("\nActive addresses\n"))
    
    const legacy = scanAddresses(AddressType.LEGACY, xpub);
    summary.set(AddressType.LEGACY, legacy.balance);

    const segwit = scanAddresses(AddressType.SEGWIT, xpub);
    summary.set(AddressType.SEGWIT, segwit.balance);

    const nativeSegwit = scanAddresses(AddressType.NATIVE, xpub);
    summary.set(AddressType.NATIVE, nativeSegwit.balance);

    operations = getSortedOperations(
      legacy.addresses, 
      segwit.addresses, 
      nativeSegwit.addresses
    );
    
    display.displayOperations(operations);
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
      const address = new Address(addressType, xpub, account, (index || 0));
      
      display.updateAddressDetails(address);
      
      getStats(address);
      
      display.updateAddressDetails(address);
      
      summary.set(addressType, address.getBalance());
    })
  }
  
  console.log(chalk.bold("\nSummary\n"));
  
  for (let [addressType, value] of summary.entries()) {
    display.showSummary(addressType, value);
  }

  return operations;
}

export { run }