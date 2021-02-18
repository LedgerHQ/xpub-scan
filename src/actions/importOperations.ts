import fs from 'fs';
import chalk from 'chalk';
// @ts-ignore
import sb from 'satoshi-bitcoin';

import { Operation } from '../models/operation'

interface Txid {
    date: string,
    hash: string
}

enum MatchingStatus {
    MATCH,
    MISMATCH,
    IMPORTED_MISSING,
    ACTUAL_MISSING
}

// get lines from a file
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
                op.setAddress(recipient);
                op.setAsIn();

                operations.push(op);
            }
            else if (type === 'DEBIT') {
                const op = new Operation(date[0], amount);
                op.setTxid(txid);
                op.setAddress(sender);
                op.setAsOut();

                operations.push(op);
            }
        }
    });

    return operations;
}

// import transactions from a type B CSV
//
// returns an array of type B imported transactions
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
            op.setAsIn();

            operations.push(op);
        }
        else if (type === 'OUT') {
            // out transactions: substract fees from amount (in satoshis)
            const amountInSatoshis = sb.toSatoshi(amount) - sb.toSatoshi(fees);
            const op = new Operation(date[0], sb.toBitcoin(amountInSatoshis));
            op.setTxid(txid);
            op.setAsOut();

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
function importTransactions(path: string) : Operation[] {
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

    console.log(
        chalk.grey(
            String(operations.length)
            .concat(' operations have been imported')
        )
    );

    return operations;
}

// sort by amount and then, if need, by address
function compareOperations(A: Operation, B: Operation){
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
//  - long address: ellipsis
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

function showOperations(status: MatchingStatus, opA: Operation, opB?: Operation) {
    const halfColorPadding = 84;
    const fullColorPadding = 85;

    let imported: string = '';
    let actual: string = '';

    switch(status) {
        case MatchingStatus.MATCH:
            /* fallthrough */
        case MatchingStatus.MISMATCH:
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
        case MatchingStatus.ACTUAL_MISSING:
            actual = '(missing operation)';

            imported = 
            opA.date.padEnd(24, ' ')
                .concat(renderAddress(opA.address))
                .concat(String(opA.amount));
            break;

        case MatchingStatus.IMPORTED_MISSING:
            imported = '(missing operation)';

            actual =
            opA.date.padEnd(24, ' ')
                .concat(renderAddress(opA.address))
                .concat(String(opA.amount));
            break;
    }

    switch(status) {
        case MatchingStatus.MATCH:
            console.log(
                chalk.greenBright(
                    imported.padEnd(halfColorPadding, ' ')
                    ), 
                actual
                );
            break;
        case MatchingStatus.MISMATCH:
            /* fallthrough */
        case MatchingStatus.ACTUAL_MISSING:
            /* fallthrough */
        case MatchingStatus.IMPORTED_MISSING:
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
function checkImportedTransactions(importedOperations: Operation[], actualOperations: Operation[]) {
    console.log(chalk.bold.whiteBright('\nComparison between imported and actual operations\n'));
    console.log(chalk.grey('imported operations\t\t\t\t\t\t\t\t     actual operations'));

    // eslint-disable-next-line no-undef
    let allTxids: Txid[] = [];
    let errors = [];

    importedOperations.forEach(op => {
        // only add txid once
        if (!allTxids.some(t => t.hash === op.txid)) {
            allTxids.push({date: op.date, hash: op.txid})
        }
    })
    
    // add potential actual operations absent from the list
    // of imported operations
    actualOperations.forEach(op => {
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
            // do not continue if no address (see: type B CSVs)
            if (!imported.address) {
                break;
            }

            // the actual operation address must already be present in the 
            // imported operations' addresses and the amount must match
            const actual = actualOperations
                .filter(op => imported.address.includes(op.address) && 
                              op.amount === imported.amount);

            if (Object.keys(actual).length === 1) {
                imported.setAddress(actual[0].address);
            }
        }

        importedOps.sort(compareOperations);
        actualOps.sort(compareOperations);

        for (let i = 0; i < Math.max(importedOps.length, actualOps.length); ++i) {
            const importedOp = importedOps[i];
            const actualOp = actualOps[i];

            // actual operation with no corresponding imported operation
            if (typeof(importedOp) === 'undefined') {
                showOperations(MatchingStatus.IMPORTED_MISSING, actualOp);
                errors.push({actual: actualOp});
                continue;
            }

            // imported operation with no corresponding actual operation
            if (typeof(actualOp) === 'undefined') {
                showOperations( MatchingStatus.ACTUAL_MISSING, importedOp);
                errors.push({imported: importedOp});
                continue;
            }

            if (!areMatching(importedOp, actualOp)) {
                showOperations(MatchingStatus.MISMATCH, importedOp, actualOp);
                errors.push({imported: importedOp, actual: actualOp});
            }
            else {
                showOperations(MatchingStatus.MATCH, importedOp, actualOp);
            }
        }
    }

    return errors;
}
  

export { importTransactions, checkImportedTransactions }