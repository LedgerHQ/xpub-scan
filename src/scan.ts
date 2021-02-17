#!/usr/bin/env node

import chalk from "chalk";
import yargs from "yargs";

import * as check_balances from "./actions/checkBalance";
import * as compare from "./actions/checkAddress";
import { checkXpub } from "./helpers";
import { importTransactions, checkImportedTransactions } from "./actions/importOperations";

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

if (address) {
  // comparison mode
  compare.run(xpub, address);
}
else if (typeof(account) !== 'undefined' && typeof(index) !== 'undefined') {
  // specific derivation mode
  check_balances.run(xpub, account, index);
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
    importedTransactions = importTransactions(args.import);
  }

  const actualTransactions = check_balances.run(xpub);

  if (typeof(importedTransactions) !== 'undefined') {
    const results = checkImportedTransactions(importedTransactions, actualTransactions);

    if (results.errors.length > 0) {
      process.exit(1);
    }
  }
}