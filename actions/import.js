const fs = require('fs');
const dateFormat = require("dateformat");
const chalk = require('chalk');
const sb = require('satoshi-bitcoin');

// get lines from a file
function getFileLines(path) {
    try {
        const contents = fs.readFileSync(path, 'utf-8');
        return contents.split(/\r?\n/);
    }
    catch (err) {
        console.log(chalk.red('File error'));
        throw new Error(err);
    }
}

// import transactions from a type A CSV
//
// returns an array of type A imported transactions
function importFromCSVTypeA(lines) {
    var transactions = [];
    
    lines.slice(1).forEach(line => {
        // split using delimiter ',' except when between double quotes
        // as a type A CSV can have several addresses in the same field:
        // ...,"<address1>,<address2>,<address3",...
        const tokens = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (tokens.length < 20) {
            return;
        }

        // expected date format: yyyy-MM-dd HH:mm:ss
        const date =        String(tokens[0])
                            .match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/ig);

        const type =        String(tokens[2]);      // CREDIT || DEBIT
        const status =      String(tokens[4]);      // CONFIRMED || ABORTED
        const amount =      parseFloat(tokens[8]);  // in bitcoins
        const sender =      String(tokens[17]).replace('"', '');
        const recipient =   String(tokens[18]).replace('"', '');

        // process only confirmed transactions
        if (status === 'CONFIRMED') {
            if (type === 'CREDIT') {
                transactions.push({
                    date: date,
                    amount: amount,
                    address: recipient
                });
            }
            else if (type === 'DEBIT') {
                transactions.push({
                    date: date,
                    amount: -1 * amount,
                    address: sender
                }); 
            }
        }
    });

    return transactions;
}

// import transactions from a type B CSV
//
// returns an array of type B imported transactions
function importFromCSVTypeB(lines) {
    var transactions = [];
    
    lines.slice(1).forEach(line => {
        const tokens = line.split(/,/);

        if (tokens.length < 8) {
            return;
        }

        // expected date format: yyyy-MM-dd HH:mm:ss
        const date =        String(tokens[0])
                            .match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/ig);

        const type =        String(tokens[2]);      // IN | OUT
        const amount =      parseFloat(tokens[3]);  // in bitcoins
        const fees =        parseFloat(tokens[4]);  // in bitcoins

        // note: type B CSV does not refer to addresses
        if (type === 'IN') {
            transactions.push({
                date: date,
                amount: amount,
            });
        }
        else if (type === 'OUT') {
            // out transactions: substract fees from amount (in satoshis)
            const amountInSatoshis = sb.toSatoshi(amount) - sb.toSatoshi(fees);
            transactions.push({
                date: date,
                amount: -1 * sb.toBitcoin(amountInSatoshis),
            }); 
        }
    });

    return transactions;
}

// dispatcher: detect the type of the imported file
// based on its contents
//
// returns an array of imported transactions:
//  - date
//  - amount
//  - address (optional)
function importTransactions(path) {
    const lines = getFileLines(path);
    var transactions;

    // type A CSV: 'Creation' is the first token
    if (lines[0].substring(0, 8) == 'Creation') {
        transactions = importFromCSVTypeA(lines);
    }
    // type B CSV: 'Operation' is the first token
    else if (lines[0].substring(0, 9) == 'Operation') {
        transactions = importFromCSVTypeB(lines);
    }

    console.log(
        chalk.grey(
            String(transactions.length)
            .concat(' transactions have been imported')
        )
    );

    return transactions;
}

// sort transaction based on
//  - first: their respective dates
//  - second: their respective amounts
//
// TODO: improve comparison between transactions
// (e.g. when dates between imported and actual transactions 
//  do not perfectly match.)
function compareTransactions(txA, txB){
    // case 1. different dates: sort by date
    if (txA.date > txB.date) {
        return -1;
    }

    if (txA.date < txB.date) {
        return 1;
    }

    // case 2. same dates: sort by amount
    if (txA.amount > txB.amount) {
        return -1;
    }

    if (txA.amount < txB.amount) {
        return 1;
    }

    return 0;
}

// identify the mismatches between amounts
// 
// returns an array of amounts that do not belong to 
// imported _and_ actual transactions
function identifyMismatches(importedTransactions, actualTransactions) {
    var importedAmounts = [], actualAmounts = [];

    importedTransactions.forEach(imported => {
        importedAmounts.push(imported.amount);
    })

    actualTransactions.forEach(actual => {
        actualAmounts.push(actual.amount);
    })

    // diff between imported and actual amounts
    // (taking into account duplicated amounts)
    var mismatches = [];

    const allUniqueAmounts = new Set(importedAmounts.concat(actualAmounts));

    allUniqueAmounts.forEach(amount => {
        const supernumeraryAmounts = Math.abs(
            importedAmounts.filter(a => a === amount).length -
            actualAmounts.filter(a =>a === amount).length
        )

        // each supernumerary amount is a mismatch
        for (var i = 0; i < supernumeraryAmounts; i++) {
            mismatches.push(amount);
        }
    });

    return mismatches;
}

// compare the imported transactions with the actual ones
// 
// returns:
//  - an array of errors (true mismatches), and
//  - an array warnings (mismatches that can be explained by the way dates are 
//    handled for imported v. actual transactions)
function checkImportedTransactions(importedTransactions, actualTransactions) {
    console.log(chalk.bold.whiteBright('\nComparison with imported transactions\n'));
    console.log(chalk.grey("imported transactions\t\t\t\t\t\t\t\t actual transactions"));
    const displayedAddressLength = 35;

    const mismatches = identifyMismatches(importedTransactions, actualTransactions);
    var errors = [], warnings = [];

    // sort transactions to make the analysis practical
    actualTransactions.sort(compareTransactions);
    importedTransactions.sort(compareTransactions);

    for (var i = 0; i < actualTransactions.length; i++) {
        const actualTx = actualTransactions[i];
        const importedTx = importedTransactions[i];

        // if no transaction, break
        if (typeof(importedTx) === 'undefined' || typeof(actualTx) === 'undefined') {
            break;
        }

        // if no imported address, set address to empty string
        if (typeof(importedTx.address) === 'undefined') {
            importedTx.address = '';
        }
        
        // make imported address displayable
        var importedAddress;
        if (importedTx.address.length < displayedAddressLength) {
            importedAddress = importedTx.address;
        }
        else {
            importedAddress = importedTx.address.substring(0, displayedAddressLength - 1) + '...';
        }

        const actualDate = dateFormat(new Date(actualTx.date * 1000), "yyyy-mm-dd HH:MM:ss");
        const actualAddress = actualTx.address.toString();

        const padding = importedAddress ? 10 : displayedAddressLength + 10;

        const imported = 
            String(importedTx.date)
            .concat("\t")
            .concat(importedAddress)
            .concat("\t")
            .concat(String(importedTx.amount).padEnd(padding, ' '));

        const actual = 
            actualDate
            .concat("\t")
            .concat(actualAddress)
            .concat("\t")
            .concat(actualTx.amount);

        // 1. check if imported and actual amounts match, and
        // 2. iff imported address is set: check that imported and actual addresses match
        if (importedTx.amount === actualTx.amount
            && !( importedAddress && !importedTx.address.includes(actualAddress) )) {
            // match
            console.log(chalk.greenBright(imported), '\t', actual);
        }
        else if (mismatches.includes(actualTx.amount) || mismatches.includes(importedTx.amount)) {
            // true mismatch
            console.log(chalk.redBright(imported,'\t', actual));

            errors.push({
                imported: importedTx, 
                actual: actualTx
            })
        }
        else {
            // not a real mismatch: to be reviewed manually;
            // this kind of situation can be explained by the timing
            // differences between imported and actual transactions
            console.log(chalk.yellowBright(imported,'\t', actual));

            warnings.push({
                imported: importedTx, 
                actual: actualTx
            })
        }
    }

    return {
        warnings: warnings,
        errors: errors
    }
}
  

module.exports = { importTransactions, checkImportedTransactions }