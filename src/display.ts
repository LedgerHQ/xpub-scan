import readline from 'readline';
import chalk from 'chalk';

import { Address } from './models/address'
import { OperationType, Operation } from './models/operation'
import { configuration } from './settings';

function convertUnits(amount: number) {
  // Currently, this function does not convert the amounts
  // into relevant units. But in the future, if the API
  // changes, it would allow to change the unit
  // depending on the network.
  // For example:
  // if (configuration.network === BITCOIN_NETWORK) {
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

// display the active/probed address with its stats
function updateAddressDetails(address: Address) {
  const addressType = address.getType()
  const account = address.getDerivation().account
  const index = address.getDerivation().index

  const derivationPath =
    'm/'
    .concat(String(account))
    .concat('/')
    .concat(String(index));

  const addressStats = address.getStats();

  // _type_  path  address ...
  let stats = 
    //    _{address type}_  {derivation path}  {address}...
      '  '
      .concat(chalk.italic(addressType.padEnd(16, ' ')))
      .concat(derivationPath.padEnd(12, ' '))
      .concat(address.toString().padEnd(46, ' '));

  if (typeof(address.getStats()) === 'undefined') {
    // if no stats, display just half of the line
    process.stdout.write(stats)
    return;
  }
  else {
    // else, display the full line
    const balance = convertUnits(address.getBalance());
    const fundedSum = convertUnits(addressStats.funded);

    transientLine(/* delete line to display complete info */);

    // ... +{total funded} ←
    stats = 
      stats
      .concat(balance.padEnd(16, ' '))
      .concat('+')
      .concat(fundedSum.padEnd(10, ' ')) // an active address has necessarily been funded,
      .concat(' ←');                     // thus this information is mandatory
  }

  // optional: spent sum
  if (typeof(addressStats.spent) !== 'undefined' && addressStats.spent > 0) {
    const spentSum = convertUnits(addressStats.spent);
  
    // ... -{total spent} →
    stats =
      stats
      .concat('\t-')
      .concat(spentSum.padEnd(10, ' '))
      .concat(' →');
  }

  console.log(stats);
}

// display the list of operations sorted by date (reverse chronological order)
function displayOperations(sortedOperations: Operation[]) {
  process.stdout.write(chalk.bold('Operations History'))

  if (typeof(configuration.APIKey) === 'undefined') {
    // warning related to the limitations of the default provider
    process.stdout.write(
      chalk.redBright(' (only the last ~50 operations by address are displayed)\n')
      )
  }
  else {
    process.stdout.write('\n');
  }
  
  const header =
  '\ndate\t\t\tblock\t\taddress\t\t\t\t\t\treceived (←) or sent (→) to self (⮂) or sibling (↺)';
  console.log(chalk.grey(header));
  
  sortedOperations.forEach(op => {    
    const amount = convertUnits(op.amount).padEnd(12, ' ');

    // {date} {block} {address}
    let status = 
      op.date.padEnd(20, ' ')
      .concat('\t')
      .concat(String(op.block).padEnd(8, ' '))
      .concat('\t')
      .concat(op.address.padEnd(42, ' '))
      .concat('\t')
      
  
    if (op.type === OperationType.In) {
      // ... +{amount} ←
      status = 
        status
        .concat('+')
        .concat(amount)
        .concat(' ←');
    }
    else {
      // ... -{amount} →|⮂|↺
      status = 
        status
        .concat('-')
        .concat(amount)

        if (op.hasSentToSelf()) {
          // case 1. Sent to the same address
          status = 
            status
            .concat(' ⮂');
        }
        else if (op.hasSentToSibling()) {
          // case 2. Sent to a sibling address
          // (different non-change address belonging to same xpub)
          status = 
            status
            .concat(' ↺');
        }
        else {
          // case 3. Sent to external address
          status = 
            status
            .concat(' →');
        }
    }
    
    console.log(status);
  })
  
  console.log(chalk.bold('\nNumber of transactions\n'));
  console.log(chalk.whiteBright(sortedOperations.length))
}

// display the summary: total balance by address type
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
//
// note: if this implementation is modified,
// always check the resulting behavior in
// Docker
function transientLine(message?: string) {
  readline.cursorTo(process.stdout, 0);

  if (typeof(message) !== 'undefined') {
    process.stdout.write(message);
  }
  else {
    // blank line
    // ! solution implemented this way to be
    // ! compatible with Docker
    process.stdout.write(''.padEnd(100, ' '));
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