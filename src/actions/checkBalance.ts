import chalk from "chalk";

import * as display from "../display";

import { Address } from "../models/address";
import { OwnAddresses } from "../models/ownAddresses";
import { ScanLimits } from "../models/scanLimits";
import { configuration } from "../configuration/settings";
import { DerivationMode } from "../configuration/currencies";
import { getStats, getTransactions } from "./processTransactions";
import { TODO_TypeThis } from "../types";
import BigNumber from "bignumber.js";

// scan all active addresses
// (that is: balances with > 0 transactions)
async function scanAddresses(
  derivationMode: DerivationMode,
  xpub: string,
  balanceOnly: boolean,
  scanLimits?: ScanLimits,
) {
  display.logStatus(
    "Scanning ".concat(chalk.bold(derivationMode)).concat(" addresses..."),
  );

  const ownAddresses = new OwnAddresses();

  let totalBalance = new BigNumber(0);
  let noTxCounter = 0;
  const addresses: Address[] = [];

  let accountSpan = undefined;
  let indexFromSpan = undefined;
  let indexToSpan = undefined;
  let preDerivationSize = undefined;

  if (scanLimits) {
    accountSpan = scanLimits.account;
    indexFromSpan = scanLimits.indexFrom;
    indexToSpan = scanLimits.indexTo;
    preDerivationSize = scanLimits.preDerivationSize;

    // important step: precompute the addresses belonging
    // to the same xpub in order to perform
    // transaction analysis further down the flow
    for (let a = 0; a < 2; a++) {
      for (let i = 0; i < preDerivationSize; i++) {
        ownAddresses.addAddress(new Address(xpub, derivationMode, a, i));
      }
    }
  }

  // TODO: should we limit ourselves to account 0 and 1?
  // if not, use a logic similar to indices exploration
  for (let account = 0; account < 2; ++account) {
    // scan span 1: account
    if (typeof accountSpan != "undefined" && account !== accountSpan) {
      continue;
    }

    const typeAccount = account === 1 ? "internal" : "external";

    display.logStatus(
      "- scanning " + chalk.italic(typeAccount) + " addresses -",
    );

    noTxCounter = 0;

    for (let index = 0 /* scan all active indices */; ; ++index) {
      // scan span 2: indices
      if (typeof indexFromSpan !== "undefined" && index < indexFromSpan) {
        continue;
      }

      if (typeof indexToSpan !== "undefined" && index > indexToSpan) {
        break;
      }

      const address = new Address(xpub, derivationMode, account, index);
      display.updateAddressDetails(address);

      const status = noTxCounter === 0 ? "analyzing" : "probing address gap";

      if (!configuration.silent && !configuration.quiet) {
        process.stdout.write(chalk.yellow(status + "..."));
      }

      await getStats(address, balanceOnly);

      const addressStats = address.getStats();

      // here, evaluate if the address needs further analysis

      if (addressStats.txsCount === 0) {
        // if no transaction, perform address gap probing if exploration
        // limit no reached yet
        noTxCounter++;
        display.transientLine(/* delete address */);

        if (account === 1 || noTxCounter >= configuration.gap_limit) {
          // TODO?: extend logic to account numbers > 1
          display.transientLine(/* delete last probing info */);
          display.logStatus(
            "- " + chalk.italic(typeAccount) + " addresses scanned -",
          );
          break;
        }

        continue;
      } else {
        noTxCounter = 0;
      }

      // convert address balance into satoshis (or equivalent unit)
      // in order to avoid issue with floats addition
      totalBalance = totalBalance.plus(address.getBalance());

      display.updateAddressDetails(address);

      // important step: add the active address to the
      // list of own addresses in order to perform
      // transaction analysis further down the flow
      ownAddresses.addAddress(address);

      addresses.push(address);
    }
  }

  // process transactions
  display.transientLine(chalk.yellowBright("Processing transactions..."));
  if (!balanceOnly) {
    addresses.forEach((address) => {
      getTransactions(address, ownAddresses);
    });
  }
  display.transientLine(/* delete address */);

  display.logStatus(derivationMode.concat(" addresses scanned\n"));

  return {
    balance: totalBalance,
    addresses,
  };
}

async function addressAnalysis(addressToScan: string, balanceOnly: boolean) {
  if (!configuration.silent) {
    console.log(chalk.bold("\nScanned address\n"));
  }

  const address = new Address(addressToScan);

  display.updateAddressDetails(address);

  await getStats(address, balanceOnly);

  if (!balanceOnly) {
    getTransactions(address);
  }

  display.updateAddressDetails(address);

  const summary = [{ balance: address.getBalance() }];

  return {
    addresses: [address],
    summary,
  };
}

async function run(
  itemToScan: string,
  balanceOnly: boolean,
  scanLimits?: ScanLimits,
) {
  if (configuration.currency.utxo_based) {
    return xpubAnalysis(itemToScan, balanceOnly, scanLimits);
  } else {
    return addressAnalysis(itemToScan, balanceOnly);
  }
}

async function xpubAnalysis(
  xpub: string,
  balanceOnly: boolean,
  scanLimits?: ScanLimits,
) {
  let activeAddresses: Address[] = [];
  const summary: TODO_TypeThis[] = [];

  let derivationModes = configuration.currency.derivationModes;

  if (configuration.specificDerivationMode) {
    // if a specific derivation mode is set, limit the scan to this mode
    derivationModes = derivationModes!.filter((derivation) =>
      derivation
        .toString()
        .toLocaleLowerCase()
        .startsWith(configuration.specificDerivationMode.toLocaleLowerCase()),
    );
  }

  if (!configuration.silent) {
    console.log(chalk.bold("\nActive addresses\n"));
  }

  for (const derivationMode of derivationModes!) {
    const results = await scanAddresses(
      derivationMode,
      xpub,
      balanceOnly,
      scanLimits,
    );

    activeAddresses = activeAddresses.concat(results.addresses);

    summary.push({
      derivationMode,
      balance: results.balance,
    });
  }

  return {
    addresses: activeAddresses,
    summary,
  };
}

export { run };
