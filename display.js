const readline = require('readline');
const dateFormat = require("dateformat");
const chalk = require('chalk');
//const sb = require('satoshi-bitcoin');

//const { BITCOIN_NETWORK } = require('./settings')

function convertUnits(amount) {
  // Currently, this function does not convert the amounts
  // into relevant units. But in the future, if the API
  // changes, it would allow to change the unit 
  // depending on the network.
  // For example:
  // if (global.network === BITCOIN_NETWORK) {
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

function convertTime(time) {
  return dateFormat(new Date(time * 1000), "yyyy-mm-dd HH:MM:ss")
}

function updateAddressDetails(address) {
  const addressType = address.getType()
  const account = address.getDerivation().account
  const index = address.getDerivation().index
  
  const derivationPath = String("m/".concat(account).concat("/").concat(index));
  const addressStats = address.getStats();
  
  // _type_  path  address ...
  var stats = 
  chalk.italic("  " + addressType.padEnd(16, ' '))
  .concat(derivationPath.padEnd(12, ' '))
  .concat(address.toString().padEnd(46, ' '))
  
  if (typeof(address.getStats()) === 'undefined') {
    process.stdout.write(stats)
    return;
  }
  else {
    const balance = convertUnits(address.getBalance());
    const fundedSum = convertUnits(addressStats.funded.sum);
    
    transientLine(/* delete line to display complete info */);
    
    stats = 
    stats
    .concat(balance.padEnd(16, ' '))
    .concat("+").concat(fundedSum.padEnd(10, ' ')).concat(" ←");
  }
  
  // optional: spent sum
  if (typeof(addressStats.spent) !== 'undefined' && addressStats.spent.sum > 0) {
    const spentSum = convertUnits(addressStats.spent.sum);
    
    stats =
    stats
    .concat("\t-")
    .concat(spentSum.padEnd(10, ' '))
    .concat(" →");
  }
  
  console.log(stats);
}

function displayTransactions(sortedAddresses) {
  console.log(chalk.bold("Transactions History").concat(chalk.redBright(" (beta feature)\n")));
  
  const header =
  "time\t\t\tblock\t\taddress\t\t\t\t\treceived (←) or sent (→) to self (↺)";
  
  console.log(chalk.grey(header));
  
  sortedAddresses.forEach(tx => {
    const amount = convertUnits(tx.amount);
    
    var status = 
    convertTime(tx.time).padEnd(8, ' ')
    .concat("\t")
    .concat(String(tx.blockHeight).padEnd(8, ' '))
    .concat("\t")
    .concat(tx.address.toString())
    .concat("\t")
    .concat(amount.padEnd(12, ' '))
    
    if (amount >= 0) {
      status = status.concat(" ←");
    }
    else if (tx.self) {
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
  console.log(chalk.whiteBright(sortedAddresses.length))
}
  
function showSummary(addressType, value) {
  const balance = convertUnits(value.balance);
    
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
  
function logStatus(status) {
  console.log(chalk.dim(status));
}

// overwrite last displayed line
// (no message: delete the line)
function transientLine(message) {
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

function showComparisonResult(xpub, address, result) {

  console.log("\nXpub:", chalk.whiteBright(xpub));
  console.log("Provided address:", chalk.whiteBright(address));

  if (Object.keys(result).length === 0) {
    // no match
    console.log(chalk.redBright(
      "The address does not seem to have been derived from this xpub!"
    ))
  }
  else {
    const derivationPath = 
    "m/".concat(result.account)
      .concat("/")
      .concat(result.index)

    if (typeof(result.partial) === 'undefined') {
      // full match
      console.log(chalk.greenBright(
        "The address has been derived from this xpub using derivation path "
          .concat(chalk.bold(derivationPath))));
    }
    else {
      // partial match
      console.log("Derived address: ", chalk.whiteBright(result.partial));

      console.log(chalk.blueBright(
        "There is a partial match between the provided address and the one derived using derivation path "
          .concat(chalk.bold(derivationPath))));
    }
  }
}

module.exports = {
    showSummary, 
    logStatus, 
    updateAddressDetails, 
    displayTransactions, 
    transientLine,
    showComparisonResult
}