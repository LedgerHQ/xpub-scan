import chalk from "chalk";

import * as display from "../display";

import { Address } from "../models/address";
import { OwnAddresses } from "../models/ownAddresses";
import { ScanLimits } from "../models/scanLimits";
import { configuration } from "../configuration/settings";
import { DerivationMode } from "../configuration/currencies";
import { getStats, getTransactions } from "./processTransactions";
import { Summary } from "../types";
import { deriveAddress } from "../actions/deriveAddresses";

import BigNumber from "bignumber.js";

/**
 * derive and scan all active addresses _for a given derivation mode_
 * note: an ACTIVE ADDRESS is an address with > 0 transactions
 * @param derivationMode a derivation mode (enum)
 * @param xpub the xpub to scan
 * @param balanceOnly option to fetch the balance only—not the transactions
 * @param scanLimits option to limit the scan to a certain account and indices range
 * @returns an object containing the total balance for the derivation mode as well as
 *          a list of active addresses associated with it
 */
async function deriveAndScanAddressesByDerivationMode(
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
  const addresses: Array<Address> = [];

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

      if (addressStats.txsCount.isZero()) {
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

        if (account === 1 || txCounter >= +configuration.gap_limit) {
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

/**
 * Scan an address (account-based mode)
 * @param itemToScan xpub from which an address will be derived, or directly an address
 * @param balanceOnly option to fetch the balance only—not the transactions
 * @returns an array containing this address and a summary that includes the total balance
 *          (TODO: simplify in order to normalize with xpub analysis)
 */
async function addressAnalysis(itemToScan: string, balanceOnly: boolean) {
  if (!configuration.silent) {
    console.log(chalk.bold("\nScanned address\n"));
  }

  let address;

  if (itemToScan.substring(0, 4).toLocaleLowerCase() === "xpub") {
    // the item to scan appears to be an xpub: derive just the first address
    const derivationMode =
      configuration.currency.derivationModes![0] || DerivationMode.UNKNOWN;
    address = new Address(deriveAddress(derivationMode, itemToScan));
  } else {
    // the item to scan is directly an address: construct it
    address = new Address(itemToScan);
  }

  if (typeof address === "undefined") {
    throw new Error(`Address cannot be instantiated from "${itemToScan}"`);
  }

  display.updateAddressDetails(address);

  // fetch (from external provider) the basic data regarding the address
  // (balance, transactions count, etc.)
  await getStats(address, balanceOnly);

  if (!balanceOnly) {
    // also (if applicable), fetch (from the external provider) the raw transactions
    // associated with the address
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

/**
 * Run the analysis
 * @param itemToScan ITEM TO SCAN can be an xpub or an address
 *                   (that is why it is named `itemToScan` instead of xpub)
 * @param balanceOnly option to fetch the balance only—not the transactions
 * @param scanLimits option to limit the scan to a certain account and indices range
 * @returns a list of active addresses and a summary (total balance per derivation mode)
 */
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

/**
 * scan an xpub (UTXO-based mode)
 * @param xpub the xpub to scan
 * @param balanceOnly option to fetch the balance only—not the transactions
 * @param scanLimits option to limit the scan to a certain account and indices range
 * @returns a list of active addresses and a summary (total balance per derivation mode)
 */
async function xpubAnalysis(
  xpub: string,
  balanceOnly: boolean,
  scanLimits?: ScanLimits,
) {
  let activeAddresses: Array<Address> = [];
  const summary: Array<Summary> = [];

  // get all derivation modes associated with the currency type
  // (e.g., for Bitcoin: legacy, SegWit, native SegWit, and taproot)
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
    // loop over the derivation modes and `scan` the addresses belonging to
    // the current derivation mode
    // (that is: derive them and identify the active ones)
    const results = await deriveAndScanAddressesByDerivationMode(
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
