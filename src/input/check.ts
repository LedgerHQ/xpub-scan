import fs from "fs";
import chalk from "chalk";

import { currencies, DerivationMode } from "../configuration/currencies";
import { TODO_TypeThis } from "../types";
import { Currency } from "../models/currency";

/**
 * Ensure that args are valid
 * @param  {any} args
 * @returns void
 */
export const checkArgs = (args: TODO_TypeThis, argv: string[]): void => {
  args.itemToScan = args._[0];

  if (Number(args.itemToScan)) {
    args.itemToScan = argv[2]; // TODO(ETH): comment
  }

  const itemToScan = args.itemToScan;
  const testnet = args.testnet;
  const address = args.address;
  const balance = args.balance;
  const save = args.save;
  const currency = args.currency;
  const derivationMode = args.derivationMode;
  const account = args.account;
  const index = args.index;
  const fromIndex = args.fromIndex;
  const toIndex = args.toIndex;
  const preDerivationSize = args.preDerivationSize;

  // xpub: set, non-empty
  if (typeof itemToScan === "undefined" || itemToScan === "") {
    throw new Error("Xpub or address is required");
  }

  // address: non-empty
  if (typeof address !== "undefined" && address === "") {
    throw new Error("Address should not be empty");
  }

  // imported balance: integer (i.e., base unit)
  if (typeof balance !== "undefined") {
    if (balance % 1 !== 0) {
      throw new Error("Balance is not an integer: " + balance);
    }
  }

  if (args.balanceOnly && args.operations) {
    throw new Error("You cannot pass an operation file in --balance-only mode");
  }

  // currency: exists
  if (typeof currency !== "undefined") {
    args.currency = args.currency.toUpperCase();

    const currencyProperties = Object.entries(currencies).filter(
      (c) => c[1].symbol.toUpperCase() === args.currency.toUpperCase(),
    );

    if (currencyProperties.length === 0) {
      throw new Error(
        "Currency '" + currency + "' has not been implemented yet",
      );
    }
  }

  // derivation mode: compatible with (implicitly) selected currency
  if (typeof derivationMode !== "undefined") {
    let availableDerivationModes: Array<DerivationMode> = [];

    if (typeof currency !== "undefined") {
      // if currency is defined, explicitly use its derivation modes
      const configuredCurrency: Currency = Object.entries(currencies)
        .filter(
          (c) => c[1].symbol.toUpperCase() === args.currency.toUpperCase(),
        )
        .map((c) => {
          return c[1];
        })[0];

      // implementation note: this complex way of performing this verification
      // is due to the fact that derivationModes is optional...
      for (const c of Object.entries(configuredCurrency)) {
        if (c[0] === "derivationModes") {
          availableDerivationModes = c[1];
        }
      }
    } else {
      // if currency is not defined, implicitly use BTC's derivation modes
      availableDerivationModes = currencies.btc.derivationModes;
    }

    if (
      availableDerivationModes.filter((d) =>
        d.toLocaleLowerCase().startsWith(derivationMode.toLocaleLowerCase()),
      ).length === 0
    ) {
      throw new Error(
        "Selected derivation mode " +
          derivationMode +
          " is not compatible with selected currency",
      );
    }
  }

  // warnings: not implemented yet
  if (typeof args.addresses !== "undefined") {
    console.log(
      chalk.bgYellowBright.black(
        " Warning: `--addresses` option has not been implemented yet. Skipped. ",
      ),
    );
  }

  if (typeof args.utxos !== "undefined") {
    console.log(
      chalk.bgYellowBright.black(
        " Warning: `--utxos` option has not been implemented yet. Skipped. ",
      ),
    );
  }

  // imported files: non-empty, exist
  const importedFiles = [args.addresses, args.utxos, args.operations];
  for (const importedFile of importedFiles) {
    if (typeof importedFile !== "undefined") {
      if (importedFile === "" || !fs.existsSync(importedFile)) {
        throw new Error("Imported file " + importedFile + " does not exist");
      }
    }
  }

  // save dirpath: exists, is a directory, writable
  if (typeof save !== "undefined" && save.toLocaleLowerCase() !== "stdout") {
    try {
      if (!fs.statSync(save).isDirectory()) {
        throw new Error("Save path " + save + " is not a directory");
      }
    } catch {
      throw new Error("Save path " + save + " does not exist");
    }

    fs.access(save, fs.constants.W_OK, function (err) {
      if (err) {
        throw new Error("Save directory " + save + " is not writable");
      }
    });
  }

  // account/index/scanLimits options
  if (typeof account !== "undefined") {
    // -a {positive number}
    if (account < 0) {
      throw new Error(
        "Account number is required to be positive (including zero)",
      );
    }

    // -a X -i Y or -a X --from-index Y [--to-index Z]
    if (typeof index === "undefined" && typeof fromIndex === "undefined") {
      throw new Error(
        "Index or scanLimits is required when account number option (`-a`) is enabled",
      );
    }

    // -a X -i {positive number}
    if (typeof index !== "undefined" && index < 0) {
      throw new Error(
        "Index number is required to be positive (including zero)",
      );
    }

    if (typeof fromIndex !== "undefined") {
      // -a X --from-index {postive number} [--to-index {postive number}]
      if (fromIndex < 0) {
        throw new Error(
          "`--from-index` option is required to be positive (including zero)",
        );
      }

      if (typeof toIndex !== "undefined") {
        if (toIndex < 0) {
          throw new Error("`--to-index` option is required to be positive");
        }

        // -a X --from-index Y --to-index Z | Y <= Z
        if (fromIndex > toIndex) {
          throw new Error(
            "`--from-index` has to be less or equal to `--to-index`",
          );
        }
      }
    }
  } else {
    // -a X -i Y
    if (typeof index !== "undefined") {
      throw new Error(
        "Account number is required when index number option (`-i`) is enabled",
      );
    }

    // -a X --from-index Y --to-index Z
    if (typeof fromIndex !== "undefined") {
      throw new Error(
        "Account number is required when scanLimits index option (`--from-index`) is enabled",
      );
    }
  }

  if (typeof preDerivationSize !== "undefined") {
    if (preDerivationSize < 0) {
      throw new Error(
        "`--pre-derivation-size` option is required to be positive",
      );
    }
  } else if (typeof account !== "undefined") {
    args.preDerivationSize = 2000; // magic number
  }

  // if needed, create scanLimits
  if (typeof account !== "undefined") {
    if (typeof index !== "undefined") {
      args.scanLimits = {
        account,
        indexFrom: index,
        indexTo: index,
        preDerivationSize: args.preDerivationSize,
      };
    } else if (typeof fromIndex !== "undefined") {
      args.scanLimits = {
        account,
        indexFrom: fromIndex,
        indexTo: toIndex,
        preDerivationSize: args.preDerivationSize,
      };
    }
  }

  // testnet
  if (typeof testnet !== "undefined" && testnet) {
    // temporary guard clause:
    // only Bitcoin testnet is supported at the moment
    if (
      args.xpub.substring(0.4).toLocaleLowerCase() !== "tpub" &&
      typeof currency !== "undefined" &&
      currency.toUpperCase() !== "BTC"
    ) {
      throw new Error(
        "The analysis of this currency cannot be performed on testnet",
      );
    }
  }

  if (args.customProvider && !process.env.XPUB_SCAN_CUSTOM_API_KEY_V2) {
    throw new Error(
      "Custom provider v2 API key (XPUB_SCAN_CUSTOM_API_KEY_V2) is missing",
    );
  }
};
