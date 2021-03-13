import fs from 'fs';
import chalk from 'chalk';
// @ts-ignore
import sb from 'satoshi-bitcoin';

import { Operation } from '../models/operation'
import { Comparison, ComparisonStatus } from '../models/comparison'
import { configuration } from '../settings';

interface Txid {
    date: string,
    hash: string
}

// get lines from a file
// TODO: properly rework this function
function getFileLines(path: string) {
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
//
// TODO: use a CSV parser instead
function importFromCSVTypeA(lines: string[]) : Operation[] {
    let operations: Operation[] = [];
    
    lines.slice(1).forEach(line => {
        // split using delimiter ',' except when between double quotes
        // as a type A CSV can have several addresses in the same field:
        // ...,'<address1>,<address2>,<address3',...
        const tokens = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (tokens.length < 20) {
            return;
        }

        // expected date format: yyyy-MM-dd HH:mm:ss
        const date =        /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/ig
                            .exec(tokens[0]) || '';

        const type =        String(tokens[2]);      // CREDIT || DEBIT
        const status =      String(tokens[4]);      // CONFIRMED || ABORTED
        const amount =      parseFloat(tokens[8]);  // in bitcoins
        const txid =        tokens[16];
        const sender =      String(tokens[17]).replace('"', '');
        const recipient =   String(tokens[18]).replace('"', '');

        // process only confirmed transactions
        if (status === 'CONFIRMED') {
            if (type === 'CREDIT') {
                const op = new Operation(date[0], amount);
                op.setTxid(txid);

                // recipient: one address or several concatenated addresses
                // ! for this type of CSV, this field is required and should 
                // default to a non-empty string (here: `(no address)`) to 
                // ensure that an operation without address results in a mismatch
                op.setAddress(recipient || '(no address)'); 
                                                            
                op.setType("Received")

                operations.push(op);
            }
            else if (type === 'DEBIT') {
                const op = new Operation(date[0], amount);
                op.setTxid(txid);

                // sender: one address or several concatenated addresses
                // ! for this type of CSV, this field is required and should 
                // default to a non-empty string (here: `(no address)`) to 
                // ensure that an operation without address results in a mismatch
                op.setAddress(sender || '(no address)');

                op.setType("Sent")

                operations.push(op);
            }
        }
    });

    return operations;
}

// import transactions from a type B CSV
//
// returns an array of type B imported transactions
//
// TODO: use a CSV parser instead
function importFromCSVTypeB(lines: string[]) : Operation[] {
    let operations: Operation[] = [];
    
    lines.slice(1).forEach( (line: string) => {
        const tokens = line.split(/,/);

        if (tokens.length < 8) {
            return;
        }

        // expected date format: yyyy-MM-dd HH:mm:ss
        const date =        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/ig
                            .exec(tokens[0]) || '';

        const type =        String(tokens[2]);      // IN | OUT
        const amount =      parseFloat(tokens[3]);  // in bitcoins
        const fees =        parseFloat(tokens[4]);  // in bitcoins
        const txid =        tokens[5];

        // note: type B CSV does not refer to addresses
        if (type === 'IN') {
            const op = new Operation(date[0], amount);
            op.setTxid(txid);
            op.setType("Received")

            operations.push(op);
        }
        else if (type === 'OUT') {
            // out transactions: substract fees from amount (in satoshis)...
            const amountInSatoshis = sb.toSatoshi(amount) - sb.toSatoshi(fees);
            // ... and couvert the total back to Bitcoin
            // (otherwise, there would be floating number issues)
            const op = new Operation(date[0], sb.toBitcoin(amountInSatoshis));
            op.setTxid(txid);
            op.setType("Sent")

            operations.push(op);
        }
    });

    return operations;
}

// dispatcher: detect the type of the imported file
// based on its contents
//
// returns an array of imported transactions:
//  - date
//  - amount
//  - address (optional)
function importOperations(path: string) : Operation[] {
    const lines = getFileLines(path);
    const firstLine = lines[0].replace('"', '');

    let operations: Operation[] = [];

    // type A CSV: 'Creation' is the first token
    if (firstLine.substring(0, 8) === 'Creation') {
        operations = importFromCSVTypeA(lines);
    }
    // type B CSV: 'Operation' is the first token
    else if (firstLine.substring(0, 9) === 'Operation') {
        operations = importFromCSVTypeB(lines);
    }
    else {
        throw new Error('CSV format not recognized.')
    }

    if (!configuration.quiet) {
        console.log(
            chalk.grey(
                String(operations.length)
                .concat(' operations have been imported')
            )
        );
    }

    // TODO: at this point, generate a warning/error 
    // message if no operation has been imported 
    // (file parsing issue?)

    return operations;
}

// sort by amount and, _then, if needed_, by address
function compareOpsByAmountThenAddress(A: Operation, B: Operation){
    // amount
    if (A.amount > B.amount) {
        return -1;
    }

    if (A.amount < B.amount) {
        return 1;
    }

    // address
    if (A.address > B.address) {
        return -1;
    }

    if (A.address < B.address) {
        return 1;
    }

    return 0;
}

function areMatching(importedOperation: Operation, actualOperation: Operation) : boolean {
    const importedAddress = importedOperation.getAddress();

    // only check if imported address is set (not always the case: see type B CSV)
    // besides, imported address can be a superset of actual address as the 
    // imported operation can have several addresses; therefore, `includes` has to
    // be used
    if ( importedAddress && !importedAddress.includes(actualOperation.getAddress()) ) {
        return false;
    }

    if (importedOperation.amount !== actualOperation.amount) {
        return false;
    }

    return true;
}

// make addresses displayable:
//  - no address: empty string
//  - long address (native): ellipsis
function renderAddress(address: string) {
    const maxLength = 35;

    if (!address) {
        return '';
    }

    if (address.length < maxLength) {
        return address
            .padEnd(maxLength + 4, ' ');
    }

    return address.substring(0, maxLength - 3)
        .concat('...')
        .padEnd(maxLength + 4, ' ');
}

// TODO?: export in a dedicated module (display.ts)?
function showOperations(status: ComparisonStatus, opA: Operation, opB?: Operation) {
    if (configuration.quiet) {
        return;
    }
    
    const halfColorPadding = 84;
    const fullColorPadding = 85;

    let imported: string = '';
    let actual: string = '';

    switch(status) {
        case "Match":
            /* fallthrough */
        case "Mismatch":
            imported = 
            opA.date.padEnd(24, ' ')
                .concat(renderAddress(opA.address))
                .concat(String(opA.amount));

                if (opB) {
                actual =
                opB.date.padEnd(24, ' ')
                    .concat(renderAddress(opB.address))
                    .concat(String(opB.amount));
                }
            break;
        case "Extra Operation":
            actual = '(missing operation)';

            imported = 
            opA.date.padEnd(24, ' ')
                .concat(renderAddress(opA.address))
                .concat(String(opA.amount));
            break;

        case "Missing Operation":
            imported = '(missing operation)';

            actual =
            opA.date.padEnd(24, ' ')
                .concat(renderAddress(opA.address))
                .concat(String(opA.amount));
            break;
    }

    switch(status) {
        case "Match":
            console.log(
                chalk.greenBright(
                    imported.padEnd(halfColorPadding, ' ')
                    ), 
                actual
                );
            break;
        case "Mismatch":
            /* fallthrough */
        case "Missing Operation":
            /* fallthrough */
        case "Extra Operation":
            console.log(
                chalk.redBright(
                    imported.padEnd(fullColorPadding, ' ').concat(actual)
                    ));
            break;
    }
}

// compare the imported operations with the actual ones
// 
// returns an array of errors
function checkImportedOperations(importedOperations: Operation[], actualOperations: Operation[]) : Comparison[] {
    console.log(chalk.bold.whiteBright('\nComparison between imported and actual operations\n'));
    console.log(chalk.grey('imported operations\t\t\t\t\t\t\t\t     actual operations'));

    // eslint-disable-next-line no-undef
    let allTxids: Txid[] = []; // TODO: convert into a Set as they have to be unique
    let comparisons: Comparison[] = [];

    importedOperations.forEach(op => {
        // only add txid once
        if (!allTxids.some(t => t.hash === op.txid)) {
            allTxids.push({date: op.date, hash: op.txid})
        }
    })
    
    // add potential actual operations absent from the list
    // of imported operations
    actualOperations.forEach(op => {
        // only add txid once
        if (!allTxids.some(t => t.hash === op.txid)) {
            allTxids.push({date: op.date, hash: op.txid});
        }
    })

    // sort by reverse chronological order
    allTxids.sort((a, b) => a.date > b.date ? -1 : a.date < b.date ? 1 : 0);

    for (const txid of allTxids) {
        const importedOps = importedOperations.filter(op => op.txid === txid.hash);
        const actualOps = actualOperations.filter(op => op.txid === txid.hash);

        // the imported operations can have multiple concatenated addresses
        // (see: type A CSV) that have to be reduced to only one: 
        // the one corresponding to that of an actual operation from the same 
        // block and with the same amount
        for (let imported of importedOps) {
            // do not continue if no address (see: type B CSVs): not relevant
            if (!imported.address) {
                break;
            }

            // the actual operation address must already be present in the 
            // imported operations' addresses and the amount must match
            const actual = actualOperations
                .filter(op => imported.address.includes(op.address) 
                              && op.amount === imported.amount);

            if (Object.keys(actual).length === 1) {
                imported.setAddress(actual[0].address);
            }
        }

        // sort both arrays of operations to ease the comparison
        importedOps.sort(compareOpsByAmountThenAddress);
        actualOps.sort(compareOpsByAmountThenAddress);

        // Math.max(...) used here because the imported and actual arrays do not
        // necessarily have the same size (i.e. missing operations)
        for (let i = 0; i < Math.max(importedOps.length, actualOps.length); ++i) {
            const importedOp = importedOps[i];
            const actualOp = actualOps[i];

            // actual operation with no corresponding imported operation
            if (typeof(importedOp) === 'undefined') {
                showOperations("Missing Operation", actualOp);
                
                comparisons.push({
                    imported: undefined,
                    actual: actualOp,
                    status: "Missing Operation"
                });

                continue;
            }

            // imported operation with no corresponding actual operation
            if (typeof(actualOp) === 'undefined') {
                showOperations( "Extra Operation", importedOp);
                
                comparisons.push({
                    imported: importedOp,
                    actual: undefined,
                    status: "Extra Operation"
                })

                continue;
            }

            if (!areMatching(importedOp, actualOp)) {
                // mismatch
                showOperations("Mismatch", importedOp, actualOp);

                comparisons.push({
                    imported: importedOp,
                    actual: actualOp,
                    status: "Mismatch"
                });
            }
            else {
                // match
                showOperations("Match", importedOp, actualOp);

                comparisons.push({
                    imported: importedOp,
                    actual: actualOp,
                    status: "Match"
                });
            }
        }
    }

    return comparisons;
}

export { importOperations, checkImportedOperations }
