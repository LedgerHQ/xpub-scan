#!/usr/bin/env node

import chalk from "chalk";

import * as checkBalances from "./actions/checkBalance";
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
import { configuration } from "./configuration/settings";

// eslint-disable-next-line
const { version } = require("../package.json");

const args = getArgs();

const scanLimits = args.scanLimits;
const address = args.address;
const currency = args.currency;
const testnet = args.testnet;
const derivationMode = args.derivationMode;
const itemToScan = args.itemToScan; // xpub or address

init(itemToScan, args.silent, args.quiet, currency, testnet, derivationMode);

const now = new Date();

let exitCode = 0;

async function scan() {
  if (address) {
    // comparison mode
    await compare.run(itemToScan, address);
  } else {
    // scan mode
    let importedTransactions;

    if (!args.operations) {
      // if no file path has been provided, only the xpub is expected to have
      // been specified
      if (args._.length > 1) {
        console.log(
          chalk.red(
            "Only 1 xpub or address expected. Please check the documentation.",
          ),
        );
        process.exit(1);
      }
    } else {
      // if a file path has been provided, import its transactions
      importedTransactions = importOperations(args.operations);
    }

    const scanResult = await checkBalances.run(itemToScan, scanLimits);
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
      xpub: itemToScan,
      date: now,
      version,
      mode,
      preDerivationSize: args.preDerivationSize,
      derivationMode: configuration.specificDerivationMode,
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

    if (args.diff || args.balance || args.balance === 0) {
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
