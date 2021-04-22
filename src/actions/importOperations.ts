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
    const operations: Operation[] = [];
    
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
                op.setAddress(recipient); 
                                                            
                op.setType("Received");

                operations.push(op);
            }
            else if (type === 'DEBIT') {
                const op = new Operation(date[0], amount);
                op.setTxid(txid);

                // sender: one address or several concatenated addresses
                // ! for this type of CSV, this field is required and should 
                // default to a non-empty string (here: `(no address)`) to 
                // ensure that an operation without address results in a mismatch
                op.setAddress(sender);

                op.setType("Sent");

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
    const operations: Operation[] = [];
    
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
            op.setType("Received");

            operations.push(op);
        }
        else if (type === 'OUT') {
            // out transactions: substract fees from amount (in satoshis)...
            const amountInSatoshis = sb.toSatoshi(amount) - sb.toSatoshi(fees);
            // ... and convert the total back to Bitcoin
            // (otherwise, there would be floating number issues)
            const op = new Operation(date[0], sb.toBitcoin(amountInSatoshis));
            op.setTxid(txid);
            op.setType("Sent");

            operations.push(op);
        }
    });

    return operations;
}

// import transactions from a type A JSON
//
// returns an array of type A imported transactions
function importFromJSONTypeA(lines: string[]) : Operation[] {    
    const operations: Operation[] = [];

    let ops;

    try {
        ops = JSON.parse(lines.join('')).operations;
    } 
    catch (err) {
        throw new Error('JSON parsing error');
    }

    for (const operation of ops) {
        const type              = operation.operation_type;
        
        const date              = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/ig
                                    .exec(operation.transaction.received_at) || '';

        const txid              = operation.hash;
        const valueInSatoshis   = parseFloat(operation.amount);      // in satoshis
        const feesInSatoshis    = parseFloat(operation.fees);        // in satoshis

        if (type === 'receive') {
            const op = new Operation(date[0], sb.toBitcoin(valueInSatoshis));
            op.setTxid(txid);
            op.setType("Received");
            
            let addresses = [];
            for (const output of operation.transaction.outputs) {
                if (output.derivation !== null) {
                    addresses.push(output.address);
                }
            }

            op.setAddress(addresses.join(','));

            operations.push(op);
        }
        else if (type === 'send') {
            // out transactions: substract fees from amount (in satoshis)...
            const amountInSatoshis = valueInSatoshis - feesInSatoshis;
            // ... and convert the total back to Bitcoin
            // (otherwise, there would be floating number issues)
            const op = new Operation(date[0], sb.toBitcoin(amountInSatoshis));
            op.setTxid(txid);
            op.setType("Sent");

            let addresses = [];
            for (const input of operation.transaction.inputs) {
                if (input.derivation !== null) {
                        addresses.push(input.address);
                }
            }

            op.setAddress(addresses.join(','));

            operations.push(op);
        }
    }

    return operations;
}

// import transactions from a type B JSON
//
// returns an array of type B imported transactions
function importFromJSONTypeB(lines: string[]) : Operation[] {
    const operations: Operation[] = [];

    let ops;

    try {
        ops = JSON.parse(lines.join('')).operations;
    } 
    catch (err) {
        throw new Error('JSON parsing error');
    }

    for (const operation of ops) {
        const type              = operation.type;
        
        const date              = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/ig
                                    .exec(operation.date) || '';

        const txid              = operation.hash;
        const valueInSatoshis   = parseFloat(operation.value);      // in satoshis
        const feesInSatoshis    = parseFloat(operation.fee);        // in satoshis
        const recipient         = operation.recipients.join(',');
        const sender            = operation.senders.join(',');

        if (type === 'IN') {
            const op = new Operation(date[0], sb.toBitcoin(valueInSatoshis));
            op.setTxid(txid);
            op.setType("Received");
            op.setAddress(recipient);

            operations.push(op);
        }
        else if (type === 'OUT') {
            // out transactions: substract fees from amount (in satoshis)...
            const amountInSatoshis = valueInSatoshis - feesInSatoshis;
            // ... and convert the total back to Bitcoin
            // (otherwise, there would be floating number issues)
            const op = new Operation(date[0], sb.toBitcoin(amountInSatoshis));
            op.setTxid(txid);
            op.setType("Sent");
            op.setAddress(sender);

            operations.push(op);
        }

    }

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

    // CSV FILES
    if (firstLine.substring(0, 8) === 'Creation') {
        // type A CSV: 'Creation' is the first token
        operations = importFromCSVTypeA(lines);
    }
    else if (firstLine.substring(0, 9) === 'Operation') {
        // type B CSV: 'Operation' is the first token
        operations = importFromCSVTypeB(lines);
    }

    // JSON FILES
    else if (firstLine.startsWith('{') || firstLine.startsWith('[')) {
        if (lines.some(line => line.includes('cursor'))) {
            // type A JSON: contains a reference to 'cursor',
            //              an ambiguous term, but sufficient to 
            //              distinguish it from type B JSON files
            operations = importFromJSONTypeA(lines);
        }
        else if (lines.some(line => line.includes('libcore'))) {
            // type B JSON: contains an explicit reference to 'libcore'
            operations = importFromJSONTypeB(lines);
        }
    }
    else {
        throw new Error('CSV format not recognized.');
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
// TODO: handle aggregated operations
function checkImportedOperations(importedOperations: Operation[], actualOperations: Operation[]) : Comparison[] {
    console.log(chalk.bold.whiteBright('\nComparison between imported and actual operations\n'));
    console.log(chalk.grey('imported operations\t\t\t\t\t\t\t\t     actual operations'));

    // eslint-disable-next-line no-undef
    const allTxids: Txid[] = []; // TODO: convert into a Set as they have to be unique
    const comparisons: Comparison[] = [];

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
        for (const imported of importedOps) {
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

function showDiff(actualBalance: number, importedBalance?: number, comparisons?: Comparison[], diff?: boolean) {
    let exitCode = 0

    // check operations
    if (comparisons && diff) {
        const operationsMismatches = comparisons.filter(comparison => comparison.status !== 'Match');

        if (operationsMismatches.length > 0) {
            console.log(chalk.redBright('Diff: operations mismatches'));
            console.dir(operationsMismatches);
        }
        else {
            console.log(
                chalk.greenBright('Diff: operations match')
            );
        }
    }

    // check balance
    if (importedBalance) {

      // the actual balance has to be converted into satoshis or similar units
      actualBalance = sb.toSatoshi(actualBalance);

      if (actualBalance !== importedBalance) {
        console.log(chalk.redBright('Diff: balances mismatch'));

        console.log('Imported balance:', importedBalance);
        console.log('Actual balance:  ', actualBalance);

        exitCode += 2;
      }
      else {
        console.log(
          chalk.greenBright('Diff: balances match: '.concat(actualBalance.toString()))
          );
      }
    }

    // exit codes:
    //  0: OK
    //  1: operation(s) mismatch(es)
    //  2: balance mismatch
    //  3: operation(s) _and_ balance mismatches
    return exitCode;
}

export { importOperations, checkImportedOperations, showDiff }
