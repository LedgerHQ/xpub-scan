#!/usr/bin/env node

import chalk from "chalk";
import yargs from "yargs";

import * as check_balances from "./actions/checkBalance";
import * as compare from "./actions/checkAddress";
import * as display from "./display";
import { getSortedOperations } from "./actions/processTransactions";
import { init } from "./helpers";
import { importOperations, checkImportedOperations, showDiff } from "./actions/importOperations";
import { save } from "./actions/saveAnalysis";

const VERSION = "0.0.6";

const args = yargs
  .option("account", {
      alias: "a",
      description: "Account number",
      demand: false,
      type: "number"
  })
  .option("index", {
      alias: "i",
      description: "Index number",
      demand: false,
      type: "number"
  })
  .option("address", {
      description: "Address",
      demand: false,
      type: "string"
  })
  .option("import", {
    description: "Import transactions",
    demand: false,
    type: "string"
  })
  .option("balance", {
    description: "Import balance for comparison (as to be in satoshis or similar base unit)",
    demand: false,
    type: "number"
  })
  .option("diff", {
    description: "Show diffs",
    demand: false,
    type: "boolean"
  })
  .option("save", {
    description: "Save analysis",
    demand: false,
    type: "string",
  })
  .option("silent", {
    description: "Do not display anything (except for the filepath of the saved reports)",
    demand: false,
    type: "boolean",
    default: false
  })
  .option("quiet", {
    description: "Do not display analysis progress",
    demand: false,
    type: "boolean",
    default: false
  })
  .option("currency", {
    description: "currency",
    demand: false,
    type: "string",
  }).argv;

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
  let summary;
  let actualTransactions;
  let comparisonResults;

  if (typeof(account) !== "undefined" && typeof(index) !== "undefined") {
    // specific derivation mode
    const scanResult = check_balances.run(xpub, account, index);

    actualAddresses = scanResult.addresses;
    summary = scanResult.summary;

    actualTransactions = getSortedOperations(actualAddresses);

    display.showOpsAndSummary(actualTransactions, summary);
  }
  else {
    // scan mode
    let importedTransactions;

    if (!args.import) {
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
      importedTransactions = importOperations(args.import);
    }

    const scanResult = check_balances.run(xpub);

    actualAddresses = scanResult.addresses;
    summary = scanResult.summary;

    actualTransactions = getSortedOperations(actualAddresses);

    display.showOpsAndSummary(actualTransactions, summary);

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
