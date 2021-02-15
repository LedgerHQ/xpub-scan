const fs = require('fs');
const dateFormat = require("dateformat");
const chalk = require('chalk');

function getFileContents(path) {
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

        // date: yyyy-MM-dd HH:mm:ss
        const date =        String(tokens[0])
                            .match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/ig);

        const type =        String(tokens[2]);
        const status =      String(tokens[4]);
        const amount =      parseFloat(tokens[8]);
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
    
    console.log(
        chalk.grey(
            String(transactions.length)
            .concat(' transactions have been imported')
        )
    );

    return transactions;
}

function importTransactions(path) {
    const lines = getFileContents(path);
    var transactions;

    // type A CSV: 'Creation' is the first token
    if (lines[0].substring(0, 8) == 'Creation') {
        transactions = importFromCSVTypeA(lines);
    }
    // TODO: type B CSV

    return transactions;
}

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

    // case 3. same amounts: sort by address
    if (txA.address > txB.address) {
        return -1;
    }
    if (txA.address < txB.address) {
        return 1;
    }

    return 0;
}


function checkImportedTransactions(importedTransactions, actualTransactions) {
    console.log(chalk.bold.whiteBright('\nComparison with imported transactions\n'));
    console.log(chalk.grey("imported transactions\t\t\t\t\t\t\t\t actual transactions"));

    // sort transactions to make the analysis practical
    actualTransactions.sort(compareTransactions);
    importedTransactions.sort(compareTransactions);

    for(var i = 0; i < actualTransactions.length; i++) {
        const actualTx = actualTransactions[i];
        const importedTx = importedTransactions[i];

        const actualDate = dateFormat(new Date(actualTx.date * 1000), "yyyy-mm-dd HH:MM:ss");
        const actualAddress = actualTx.address.toString();

        const importedAddress = 
            importedTx.address.length < 35 ? importedTx.address : importedTx.address.substring(0, 34) + '...';

        const imported = 
            String(importedTx.date)
            .concat("\t")
            .concat(importedAddress)
            .concat("\t")
            .concat(String(importedTx.amount).padEnd(10, ' '));

        const actual = 
            actualDate
            .concat("\t")
            .concat(actualAddress)
            .concat("\t")
            .concat(actualTx.amount);

        if (importedTx.address.includes(actualAddress) && actualTx.amount === importedTx.amount) {
            console.log(chalk.greenBright(imported), '\t', actual);
        }
        else {
            console.log(chalk.redBright(imported,'\t', actual));
        }
    }
}
  

module.exports = { importTransactions, checkImportedTransactions }