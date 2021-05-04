#!/usr/bin/env node

import chalk from "chalk";

import * as check_balances from "./actions/checkBalance";
import * as compare from "./actions/checkAddress";
import * as display from "./display";
import { getSortedOperations, getSortedUTXOS } from "./actions/processTransactions";
import { init } from "./helpers";
import { showDiff } from "./comparison/diffs";
import { checkImportedOperations } from "./comparison/compareOperations";
import { importOperations } from "./input/importOperations";
import { save } from "./actions/saveAnalysis";
import { Address } from "./models/address";
import { getArgs } from "./input/args";

const VERSION = "0.0.8";

const args = getArgs();

const account = args.account;
const index = args.index;
const address = args.address;
const currency = args.currency;

const xpub = String(args._[0]);
init(xpub, args.silent, args.quiet, currency);

const now = new Date();

let exitCode = 0;

if (address) {
  // comparison mode
  compare.run(xpub, address);
}
else {
  let actualAddresses;
  let actualUTXOs: Address[];
  let summary;
  let actualTransactions;
  let comparisonResults;

  if (typeof(account) !== "undefined" && typeof(index) !== "undefined") {
    // specific derivation mode
    const scanResult = check_balances.run(xpub, account, index);

    actualAddresses = scanResult.addresses;
    summary = scanResult.summary;

    actualUTXOs = getSortedUTXOS(actualAddresses);
    actualTransactions = getSortedOperations(actualAddresses);

    display.showResults(actualUTXOs, actualTransactions, summary);
  }
  else {
    // scan mode
    let importedTransactions;

    if (!args.operations) {
      // if no file path has been provided, only the xpub is expected to have
      // been specified
      if (args._.length > 1) {
        console.log(
          chalk.red("Only 1 arg expected (xpub). Please check the documentation.")
        );
        process.exit(1);
      }
    }
    else {
      // if a file path has been provided, import its transactions
      importedTransactions = importOperations(args.operations);
    }

    const scanResult = check_balances.run(xpub);

    actualAddresses = scanResult.addresses;
    
    actualUTXOs = [];
    actualAddresses.forEach( a => {
      if (a.isUTXO()) {
        actualUTXOs.push(a);
      }
    });

    summary = scanResult.summary;

    actualTransactions = getSortedOperations(actualAddresses);

    display.showResults(actualUTXOs, actualTransactions, summary);

    if (typeof(importedTransactions) !== "undefined") {
      comparisonResults = checkImportedOperations(importedTransactions, actualTransactions);
    }
  }

  const meta = {
    xpub,
    date: now,
    version: VERSION
  };

  const data = {
    summary,
    addresses: actualAddresses,
    transactions: actualTransactions,
    comparisons: comparisonResults
  };

  if (args.save || args.save === "" /* allow empty arg */) {
    save(meta, data, args.save);
  }

  if (args.diff || args.balance) {
    const actualBalance = summary.reduce((accumulator, s) => accumulator + s.balance, 0);
    exitCode = showDiff(actualBalance, args.balance, comparisonResults, args.diff);
  }

  process.exit(exitCode);
}
