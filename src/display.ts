import readline from "readline";
import chalk from "chalk";

import { Address } from "./models/address"
import { OperationType, Operation } from "./models/operation"

function convertUnits(amount: number) {
  // Currently, this function does not convert the amounts
  // into relevant units. But in the future, if the API
  // changes, it would allow to change the unit
  // depending on the network.
  // For example:
  // if (network.type === BITCOIN_NETWORK) {
  //   return sb.toBitcoin(amount);
  // }
  if (amount === 0) {
    return String(amount);
  }
  else {
    // 8 digital places max without trailing 0s
    return String(parseFloat(amount.toFixed(8)));
  }
}

function updateAddressDetails(address: Address) {
  const addressType = address.getType()
  const account = address.getDerivation().account
  const index = address.getDerivation().index

  const derivationPath =
    "m/"
    .concat(String(account))
    .concat("/")
    .concat(String(index));

  const addressStats = address.getStats();

  // _type_  path  address ...
  let stats = 
    chalk.italic("  " + addressType.padEnd(16, ' '))
    .concat(derivationPath.padEnd(12, ' '))
    .concat(address.toString().padEnd(46, ' '))

  if (typeof(address.getStats()) === 'undefined') {
    process.stdout.write(stats)
    return;
  }
  else {
    const balance = convertUnits(address.getBalance());
    const fundedSum = convertUnits(addressStats.funded);

    transientLine(/* delete line to display complete info */);

    stats = 
      stats
      .concat(balance.padEnd(16, ' '))
      .concat("+").concat(fundedSum.padEnd(10, ' ')).concat(" ←");
  }

  // optional: spent sum
  if (typeof(addressStats.spent) !== 'undefined' && addressStats.spent > 0) {
    const spentSum = convertUnits(addressStats.spent);
  
    stats =
      stats
      .concat("\t-")
      .concat(spentSum.padEnd(10, ' '))
      .concat(" →");
  }

  console.log(stats);
}

function displayOperations(sortedTransactions: Operation[]) {
  console.log(chalk.bold("Transactions History").concat(chalk.redBright(" (beta feature)\n")));
  
  const header =
  "date\t\t\tblock\t\taddress\t\t\t\t\t\treceived (←) or sent (→) to self (↺)";
  
  console.log(chalk.grey(header));
  
  sortedTransactions.forEach(op => {    
    let status = 
      op.date.padEnd(20, ' ')
      .concat('\t')
      .concat(String(op.block).padEnd(8, ' '))
      .concat('\t')
      .concat(op.address.padEnd(42, ' '))
      .concat('\t')
      .concat(convertUnits(op.amount).padEnd(12, ' '))
  
    if (op.type === OperationType.In) {
      status = status.concat(" ←");
    }
    else if (op.self) {
      // send to non-change address belonging to
      // the same xpub/ltub
      status = status.concat(" ↺");
    }
    else {
      status = status.concat(" →");
    }
    
    console.log(status);
  })
  
  console.log(chalk.bold("\nNumber of transactions\n"));
  console.log(chalk.whiteBright(sortedTransactions.length))
}

function showSummary(addressType: string, totalBalance: number) {
  const balance = convertUnits(totalBalance);
    
  if (balance === '0') {
  console.log(
      chalk.grey(
        addressType.padEnd(16, ' ')
          .concat(balance.padEnd(12, ' '))
      )
    );
  }
  else {
    console.log(
      chalk.whiteBright(
       addressType.padEnd(16, ' ')
      )
    .concat(
        chalk.greenBright(balance.padEnd(12, ' '))
      )
    );
  }
}

function logStatus(status: string) {
  console.log(chalk.dim(status));
}

// overwrite last displayed line
// (no message: delete the line)
function transientLine(message?: string) {
  readline.cursorTo(process.stdout, 0);

  if (typeof(message) !== 'undefined') {
    process.stdout.write(message);
  }
  else {
    // blank line
    // (solution compatible with Docker)
    process.stdout.write("".padEnd(100, ' '));
    readline.cursorTo(process.stdout, 0);
  }
}

export {
    showSummary, 
    logStatus, 
    updateAddressDetails, 
    displayOperations, 
    transientLine,
}