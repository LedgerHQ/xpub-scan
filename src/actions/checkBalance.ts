import chalk from "chalk";

import * as display from "../display";

import { Address } from "../models/address";
import { OwnAddresses } from "../models/ownAddresses";
import { ScanLimits } from "../models/scanLimits";
import { configuration } from "../configuration/settings";
import { DerivationMode } from "../configuration/currencies";
import { getStats, getTransactions } from "./processTransactions";
import { Summary } from "../types";
import { getAddress } from "../actions/deriveAddresses";

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
  let txCounter = 0;
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

    // crucial step in limited scan mode: precompute the addresses belonging
    // to the same xpub in order to perform transaction analysis further
    // down the flow. `preDerivationSize` define the number of addresses to pre-derive.
    for (let a = 0; a < 2; a++) {
      for (let i = 0; i < preDerivationSize; i++) {
        ownAddresses.addAddress(new Address(xpub, derivationMode, a, i));
      }
    }
  }

  // loop over derivation path accounts: `m/{account}/{index}`
  // note: we limit ourselves to accounts 0 and 1
  // but the scope could be extended further if needed
  for (let account = 0; account < 2; ++account) {
    // if limited scan mode is enabled and the current account is outside the scope, skip it
    if (typeof accountSpan != "undefined" && account !== accountSpan) {
      continue;
    }

    // account 0 == external addresses
    // account 1 == internal (aka change) addresses
    const typeAccount = account === 1 ? "internal" : "external";

    display.logStatus(
      "- scanning " + chalk.italic(typeAccount) + " addresses -",
    );

    txCounter = 0;

    for (let index = 0 /* scan all active indices */; ; ++index) {
      // if limited scan mode is enabled and the current index is _below_ the range, skip it
      // ______(current index)_______[     LIMITED SCAN RANGE     ]____________________________
      if (typeof indexFromSpan !== "undefined" && index < indexFromSpan) {
        continue;
      }

      // if limited scan mode is enabled and the current index is _beyond_ the range, stop the scan
      // ____________________________[     LIMITED SCAN RANGE     ]______(current index)_______
      if (typeof indexToSpan !== "undefined" && index > indexToSpan) {
        break;
      }

      // get address derived according to:
      // - its xpub (by definition),
      // - the current derivation mode (legacy, SegWit, etc.)
      // - the derivation path characteristics: `m/{account:0|1}/{index:0|∞}`
      const address = new Address(xpub, derivationMode, account, index);

      display.updateAddressDetails(address);

      const status = txCounter === 0 ? "analyzing" : "probing address gap";

      if (!configuration.silent && !configuration.quiet) {
        process.stdout.write(chalk.yellow(status + "..."));
      }

      // fetch (from external provider) the basic data regarding the address
      // (balance, transactions count, etc.)
      await getStats(address, balanceOnly);

      const addressStats = address.getStats();

      // here, evaluate if the address needs further analysis

      if (addressStats.txsCount === 0) {
        // no transaction associated with the address:
        // perform address gap probing
        // GAP PROBE: check whether an address is active in a certain range
        //
        // for instance:
        // ┌┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┐
        // ┊ m/0/0 — active (10 transactions)           ┊
        // ┊ m/0/1 — active (2 transactions)            ┊
        // ┊                                  ┐         ┊
        // ┊ m/0/2 — inactive (0 transaction) │         ┊
        // ┊ m/0/3 — inactive (0 transaction) │ GAP     ┊
        // ┊ m/0/4 — inactive (0 transaction) │         ┊
        // ┊                                  ┘         ┊
        // ┊ m/0/5 — active (4 transactions)            ┊
        // └┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┘
        //
        // in this example, the gap probing allows to detect that
        // `m/0/5` is an active address
        //
        // note: the scope of the gap probing is 20 addresses by
        // default (check `DEFAULT_GAP_LIMIT`) but can be configured
        // using the `GAP_LIMIT` environment variable

        txCounter++;
        display.transientLine(/* delete address as it is not an active one */);

        if (account === 1 || txCounter >= configuration.gap_limit) {
          // all active addresses have been scanned and the gap limit reached:
          // stop the scan for this specific derivation mode
          display.transientLine(/* delete last probing info */);
          display.logStatus(
            "- " + chalk.italic(typeAccount) + " addresses scanned -",
          );
          break;
        }

        continue;
      } else {
        txCounter = 0;
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

async function addressAnalysis(itemToScan: string, balanceOnly: boolean) {
  if (!configuration.silent) {
    console.log(chalk.bold("\nScanned address\n"));
  }

  let address = undefined;

  if (itemToScan.substring(0, 4).toLocaleLowerCase() === "xpub") {
    // if the item to scan is an xpub, derive the first address...
    const derivationMode =
      configuration.currency.derivationModes![0] || DerivationMode.UNKNOWN;
    address = new Address(getAddress(derivationMode, itemToScan));
  } else {
    // ... otherwise, it is an address: instantiate it directly
    address = new Address(itemToScan);
  }

  if (typeof address === "undefined") {
    throw new Error(`Address cannot be instantiated from "${itemToScan}"`);
  }

  display.updateAddressDetails(address);

  await getStats(address, balanceOnly);

  if (!balanceOnly) {
    getTransactions(address);
  }

  display.updateAddressDetails(address);

  const summary = [
    {
      derivationMode: DerivationMode.ETHEREUM,
      balance: new BigNumber(address.getBalance()),
    },
  ];

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
    // if the currency is UTXOs based (e.g., Bitcoin):
    // the item to scan is an xpub
    return xpubAnalysis(itemToScan, balanceOnly, scanLimits);
  } else {
    // otherwise, the currency is account-based (e.g., Ethereum):
    // the item to scan is an address
    return addressAnalysis(itemToScan, balanceOnly);
  }
}

async function xpubAnalysis(
  xpub: string,
  balanceOnly: boolean,
  scanLimits?: ScanLimits,
) {
  let activeAddresses: Address[] = [];
  const summary: Summary[] = [];

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
    // loop over the derivation modes and `scan` the addresses
    // (that is: derive them and identify the active ones)
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
