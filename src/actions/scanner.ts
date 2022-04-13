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

// eslint-disable-next-line
const { version } = require("../../package.json"); // do not modify: get the version of Xpub Scan from `package.json`

export class Scanner {
  args;
  scanLimits;
  address;
  currency;
  testnet;
  derivationMode;
  itemToScan;
  balanceOnly: boolean;
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
    this.balanceOnly = args.balanceOnly;
    init(
      this.itemToScan,
      args.silent,
      args.quiet,
      this.currency,
      this.testnet,
      this.derivationMode,
    );
  }

  async scan(): Promise<ScanResult> {
    // library mode: suppress all outputs
    if (!configuration.commandLineMode) {
      /* eslint-disable */
      console.log = function () {};
      /* eslint-enable */
      configuration.silent = true;
    }

    if (this.address) {
      // mode A: `--address {address}`:
      // an address has been provided by the user: check whether its belongs or not to the xpub
      compare.run(this.itemToScan, this.address);
      return { exitCode: this.exitCode };
    } else {
      // mode B: scan mode
      let importedTransactions: any;

      if (this.args.operations) {
        // a file path has been provided: import its transactions
        importedTransactions = importOperations(this.args.operations);
      }

      const scanResult = await checkBalances.run(
        this.itemToScan,
        this.balanceOnly,
        this.scanLimits,
      );

      const actualAddresses = scanResult.addresses; // active addresses belonging to the xpub
      const actualUTXOs = getSortedUTXOS(actualAddresses); // UTXOs (if any) belonging to the xpub
      const summary = scanResult.summary; // summary: balance per derivation path
      const actualTransactions = getSortedOperations(actualAddresses); // transactions related to the xpub

      display.showResults(
        actualUTXOs,
        actualTransactions,
        summary,
        this.balanceOnly,
      );

      const partialScan = typeof this.scanLimits !== "undefined";

      let comparisonResults;

      if (typeof importedTransactions !== "undefined") {
        // transactions have been imported: comparison mode enabled
        // — compare imported transactions with actual ones
        comparisonResults = checkImportedOperations(
          importedTransactions,
          actualTransactions,
          actualAddresses, // scan limits
          partialScan, // scan limits
        );
      }

      // full v. partial scan
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

      // (special mode for Custom W)
      if (configuration.augmentedImport) {
        // Augmented import mode:
        // Use of an augmented JSON to compare smart contract interactions
        mode += " | Augmented Import";
      }

      // balance only mode
      if (this.balanceOnly) {
        // Balance only mode
        mode += " | Balance Only";
      }

      const meta: ScanMeta = {
        xpub: this.itemToScan,
        date: this.now,
        version,
        mode,
        preDerivationSize: this.args.preDerivationSize,
        derivationMode: configuration.specificDerivationMode,
        balanceOnly: this.balanceOnly,
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
          (accumulator, s) => accumulator + s.balance.toNumber(),
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
