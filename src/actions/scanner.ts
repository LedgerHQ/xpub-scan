import chalk from "chalk";

import * as checkBalances from "./checkBalance";
import * as compare from "./checkAddress";
import * as display from "../display";
import { getSortedOperations, getSortedUTXOS } from "./processTransactions";
import { showDiff } from "../comparison/diffs";
import { checkImportedOperations } from "../comparison/compareOperations";
import { importOperations } from "../input/importOperations";
import { save } from "./saveAnalysis";
import { configuration } from "../configuration/settings";
import { ScanData, ScanMeta, ScannerArguments, ScanResult } from "../types";
import { init } from "../helpers";
import { version } from "../../package.json";

export class Scanner {
  args;
  scanLimits;
  address;
  currency;
  testnet;
  derivationMode;
  itemToScan;
  now = new Date();
  exitCode = 0;

  constructor(args: ScannerArguments) {
    this.args = args;
    this.scanLimits = args.scanLimits;
    this.address = args.address;
    this.currency = args.currency;
    this.testnet = args.testnet;
    this.derivationMode = args.derivationMode;
    this.itemToScan = args.itemToScan; // xpub or address
    init(this.itemToScan, args.silent, args.quiet, this.currency, this.testnet, this.derivationMode);
  }

  async scan(): Promise<ScanResult> {
    if (this.address) {
      // comparison mode
      await compare.run(this.itemToScan, this.address);
      return { exitCode: this.exitCode };
    } else {
      // scan mode
      let importedTransactions;

      if (!this.args.operations) {
        // if no file path has been provided, only the xpub is expected to have
        // been specified
        if (this.args._ !== undefined && this.args._.length > 1) {
          console.log(
            chalk.red(
              "Only 1 xpub or address expected. Please check the documentation.",
            ),
          );
          process.exit(1);
        }
      } else {
        // if a file path has been provided, import its transactions
        importedTransactions = importOperations(this.args.operations);
      }

      const scanResult = await checkBalances.run(this.itemToScan, this.scanLimits);
      const actualAddresses = scanResult.addresses;
      const actualUTXOs = getSortedUTXOS(actualAddresses);
      const summary = scanResult.summary;
      const actualTransactions = getSortedOperations(actualAddresses);

      display.showResults(actualUTXOs, actualTransactions, summary);

      const partialScan = typeof this.scanLimits !== "undefined";

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
        typeof this.args.account !== "undefined" &&
        typeof this.args.index !== "undefined"
      ) {
        mode = `Specific derivation path - m/${this.args.account}/${this.args.index}`;
      } else if (typeof this.scanLimits !== "undefined") {
        let upperLimit: number | string = "∞";
        if (typeof this.scanLimits.indexTo !== "undefined") {
          upperLimit = this.scanLimits.indexTo;
        }
        mode = `Partial range — account ${this.scanLimits.account}, indices ${this.scanLimits.indexFrom}⟶${upperLimit}`;
      } else {
        mode = "Full scan";
      }

      const meta: ScanMeta = {
        xpub: this.itemToScan,
        date: this.now,
        version,
        mode,
        preDerivationSize: this.args.preDerivationSize,
        derivationMode: configuration.specificDerivationMode,
      };

      const data: ScanData = {
        summary,
        addresses: actualAddresses,
        transactions: actualTransactions,
        comparisons: comparisonResults,
      };

      if (this.args.save || this.args.save === "" /* allow empty arg */) {
        save(meta, data, this.args.save);
      }

      if (this.args.diff || this.args.balance || this.args.balance === "0") {
        const actualBalance = summary.reduce(
          (accumulator, s) => accumulator + s.balance,
          0,
        );

        this.exitCode = showDiff(
          actualBalance,
          this.args.balance,
          comparisonResults,
          this.args.diff,
        );
      }

      return { meta, data, exitCode: this.exitCode };
    }
  }
}
