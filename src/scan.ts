#!/usr/bin/env node

import chalk from "chalk";

import * as check_balances from "./actions/checkBalance";
import * as compare from "./actions/checkAddress";
import * as display from "./display";
import {
  getSortedOperations,
  getSortedUTXOS,
} from "./actions/processTransactions";
import { init } from "./helpers";
import { showDiff } from "./comparison/diffs";
import { checkImportedOperations } from "./comparison/compareOperations";
import { importOperations } from "./input/importOperations";
import { save } from "./actions/saveAnalysis";
import { getArgs } from "./input/args";

const VERSION = "0.1.0";

const args = getArgs();

const scanLimits = args.scanLimits;
const address = args.address;
const currency = args.currency;
const xpub = String(args._[0]);

init(xpub, args.silent, args.quiet, currency);

const now = new Date();

let exitCode = 0;

async function scan() {
  if (address) {
    // comparison mode
    await compare.run(xpub, address);
  } else {
    // scan mode
    let importedTransactions;

    if (!args.operations) {
      // if no file path has been provided, only the xpub is expected to have
      // been specified
      if (args._.length > 1) {
        console.log(
          chalk.red(
            "Only 1 arg expected (xpub). Please check the documentation.",
          ),
        );
        process.exit(1);
      }
    } else {
      // if a file path has been provided, import its transactions
      importedTransactions = importOperations(args.operations);
    }

    const scanResult = await check_balances.run(xpub, scanLimits);
    const actualAddresses = scanResult.addresses;
    const actualUTXOs = getSortedUTXOS(actualAddresses);
    const summary = scanResult.summary;
    const actualTransactions = getSortedOperations(actualAddresses);

    display.showResults(actualUTXOs, actualTransactions, summary);

    const partialScan = typeof scanLimits !== "undefined";

    let comparisonResults;

    if (typeof importedTransactions !== "undefined") {
      comparisonResults = checkImportedOperations(
        importedTransactions,
        actualTransactions,
        actualAddresses, // scan limits
        partialScan, // scan limits
      );
    }

    let mode: string;

    if (
      typeof args.account !== "undefined" &&
      typeof args.index !== "undefined"
    ) {
      mode = `Specific derivation path - m/${args.account}/${args.index}`;
    } else if (typeof scanLimits !== "undefined") {
      let upperLimit = "∞";
      if (typeof scanLimits.indexTo !== "undefined") {
        upperLimit = scanLimits.indexTo;
      }
      mode = `Partial range — account ${scanLimits.account}, indices ${scanLimits.indexFrom}⟶${upperLimit}`;
    } else {
      mode = "Full scan";
    }

    const meta = {
      xpub,
      date: now,
      version: VERSION,
      mode,
      preDerivationSize: args.preDerivationSize
    };

    const data = {
      summary,
      addresses: actualAddresses,
      transactions: actualTransactions,
      comparisons: comparisonResults,
    };

    if (args.save || args.save === "" /* allow empty arg */) {
      save(meta, data, args.save);
    }

    if (args.diff || args.balance) {
      const actualBalance = summary.reduce(
        (accumulator, s) => accumulator + s.balance,
        0,
      );
      exitCode = showDiff(
        actualBalance,
        args.balance,
        comparisonResults,
        args.diff,
      );
    }

    process.exit(exitCode);
  }
}

scan();

// see https://nodejs.org/api/process.html#process_signal_events
function handleSignal(signal: string) {
  console.log(`Received ${signal}`);
  process.exit(1);
}
process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);
