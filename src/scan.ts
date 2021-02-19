#!/usr/bin/env node

import chalk from "chalk";
import yargs from "yargs";

import * as check_balances from "./actions/checkBalance";
import * as compare from "./actions/checkAddress";
import { checkXpub } from "./helpers";
import { importOperations, checkImportedOperations } from "./actions/importOperations";

const args = yargs
  .option('account', {
      alias: 'a',
      description: "Account number",
      demand: false,
      type: 'number'
  })
  .option('index', {
      alias: 'i',
      description: "Index number",
      demand: false,
      type: 'number'
  })
  .option('address', {
      description: "Address",
      demand: false,
      type: 'string'
  })
  .option('import', {
    description: "Import transactions",
    demand: false,
    type: 'string'
  }).argv;

const account = args.account;
const index = args.index;
const address = args.address

const xpub = String(args._[0]);
checkXpub(xpub);

// TODO: remove once stable enough
function displayWarning() {
  console.log(
    chalk.redBright(
      '\nXpub scan is not stable yet (pre-alpha release): do not hesitate to double-check its output.',
      '\nIf you notice any error, please open an issue at: https://github.com/LedgerHQ/xpub-scan/issues',
      '\nThank you.'
      )
    );
}

if (address) {
  // comparison mode
  compare.run(xpub, address);
  displayWarning();
}
else if (typeof(account) !== 'undefined' && typeof(index) !== 'undefined') {
  // specific derivation mode
  check_balances.run(xpub, account, index);
  displayWarning();
}
else {
  // scan mode
  let importedTransactions;

  if (!args.import) {
    // if no file path has been provided, only the xpub is expected to have
    // been specified
    if (args._.length > 1) {
      console.log(
        chalk.red('Only 1 arg expected (xpub). Please check the documentation.')
      )
      process.exit(1);
    }
  }
  else {
    // if a file path has been provided, import its transactions
    importedTransactions = importOperations(args.import);
  }

  const actualTransactions = check_balances.run(xpub);

  if (typeof(importedTransactions) !== 'undefined') {
    const errors = checkImportedOperations(importedTransactions, actualTransactions);

    // TODO: process the errors
    // (e.g. save them in a file, perform some CI action, etc.)
    if (errors.length > 0) {
      process.exit(1);
    }
  }

  displayWarning();
}