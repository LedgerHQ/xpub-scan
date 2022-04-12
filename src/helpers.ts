import axios from "axios";
import chalk from "chalk";
import bchaddr from "bchaddrjs";

import {
  configuration,
  DEFAULT_API_URLS,
  CRYPTOAPIS_URL,
  ETH_FIXED_PRECISION,
} from "./configuration/settings";
import { currencies } from "./configuration/currencies";
import BigNumber from "bignumber.js";

import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";

const bip32 = BIP32Factory(ecc);

async function getJSON<T>(
  url: string,
  APIKey?: string,
  { retries, retryDelayMS }: { retries?: number; retryDelayMS?: number } = {},
): Promise<T> {
  const job = async () => {
    const headers = {
      ...(APIKey ? { "X-API-Key": APIKey } : {}),
    };

    const res = await axios.get<T>(url, { headers });

    if (res.status !== 200) {
      console.log(chalk.red("GET request error"));
      throw new Error(
        "GET REQUEST ERROR: "
          .concat(url)
          .concat(", Status Code: ")
          .concat(String(res.status)),
      );
    }

    return res.data;
  };

  return retry(job, { retries, retryDelayMS });
}

async function retry<T>(
  job: () => Promise<T>,
  { retries = 5, retryDelayMS = 0 } = {},
): Promise<T> {
  let err: any = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await job();
    } catch (e) {
      err = e;
      // wait before retrying if it's not the last try
      if (retryDelayMS && i < retries - 1) {
        await new Promise((r) => setTimeout(r, retryDelayMS));
      }
    }
  }
  if (err) throw err;
  throw new Error(`No result after ${retries} retries`);
}

function setNetwork(xpub: string, currency?: string, testnet?: boolean) {
  configuration.testnet = testnet || false;

  if (
    typeof currency === "undefined" ||
    currency === "BTC" ||
    currency === "LTC" ||
    currency === "DOGE"
  ) {
    const prefix = xpub.substring(0, 4).toLocaleLowerCase();

    if (prefix === "xpub") {
      // Bitcoin mainnet
      configuration.currency = currencies.btc;
      configuration.currency.network = currencies.btc.network_mainnet;
    } else if (prefix === "tpub") {
      // Bitcoin testnet
      configuration.currency = currencies.btc;
      configuration.currency.network = currencies.btc.network_testnet;
      configuration.testnet = true;
    } else if (prefix === "ltub") {
      // Litecoin
      configuration.currency = currencies.ltc;

      // TODO: LTC testnet
      configuration.currency.network = currencies.ltc.network_mainnet;
    } else if (prefix === "dgub") {
      // Dogecoin
      configuration.currency = currencies.doge;
      configuration.currency.network = currencies.doge.network_mainnet;
    } else {
      throw new Error("INVALID XPUB: " + xpub + " has not a valid prefix");
    }
  } else {
    // Bitcoin Cash
    if (currency === "BCH") {
      configuration.currency = currencies.bch;

      // TODO: BCH testnet
      configuration.currency.network = currencies.bch.network_mainnet;
      return;
    }
    // Ethereum
    else if (currency === "ETH") {
      configuration.currency = currencies.eth;
      return;
    }

    throw new Error("INVALID CURRENCY: '" + currency + "' is not supported");
  }
}

/**
 * Configure the external provider URL (i.e., default v. Crypto APIs provider)
 * @param  {string} currency?
 *          Symbol of the currency (e.g. 'BCH')
 * @returns void
 */
const setExternalProviderURL = (): void => {
  // custom provider (i.e., API key is set)
  if (process.env.XPUB_SCAN_CUSTOM_API_KEY_V2) {
    configuration.externalProviderURL = CRYPTOAPIS_URL.replace(
      "{network}",
      configuration.testnet
        ? configuration.currency.symbol === currencies.eth.symbol
          ? "ropsten"
          : "testnet"
        : "mainnet",
    );

    configuration.providerType = "Crypto APIs";

    return;
  }

  // default provider
  const currency = configuration.currency;
  if (
    currency.symbol === currencies.btc.symbol ||
    currency.symbol === currencies.ltc.symbol ||
    currency.symbol === currencies.doge.symbol
  ) {
    configuration.externalProviderURL = DEFAULT_API_URLS.general;
    return;
  }

  if (currency.symbol === currencies.bch.symbol) {
    configuration.externalProviderURL = DEFAULT_API_URLS.bch;
    return;
  }

  if (currency.symbol === currencies.eth.symbol) {
    configuration.externalProviderURL = DEFAULT_API_URLS.eth;
  }
};

function checkXpub(xpub: string) {
  try {
    bip32.fromBase58(xpub, configuration.currency.network);
  } catch (e) {
    throw new Error("INVALID XPUB: " + xpub + " is not a valid xpub -- " + e);
  }
}

function init(
  xpub: string,
  silent?: boolean,
  quiet?: boolean,
  currency?: string,
  testnet?: boolean,
  derivationMode?: string,
) {
  if (typeof silent !== "undefined") {
    configuration.silent = silent;
  }

  if (typeof quiet !== "undefined") {
    configuration.quiet = quiet;
  }

  setNetwork(xpub, currency, testnet);
  setExternalProviderURL();

  if (configuration.currency.utxo_based) {
    checkXpub(xpub);
  }

  configuration.specificDerivationMode = derivationMode!;

  if (configuration.silent) {
    return;
  }

  console.log(
    chalk.grey(
      "(Data fetched from the "
        .concat(chalk.bold(configuration.providerType))
        .concat(" provider)"),
    ),
  );
}

// remove prefixes (`bitcoincash:`) from Bitcoin Cash addresses
function toUnprefixedCashAddress(address: string) {
  if (configuration.currency.symbol !== currencies.bch.symbol) {
    return undefined;
  }

  if (!bchaddr.isCashAddress(address)) {
    address = bchaddr.toCashAddress(address);
  }

  return address.replace("bitcoincash:", "");
}

/**
 * Convert from unit of account to base unit (e.g. bitcoins to satoshis)
 * (TODO: refactor for a more proper conversion mechanism)
 * @param amount the amount (in unit of account) to convert
 * @returns the converted amount, in base unit
 */
function toBaseUnit(amount: BigNumber): string {
  if (amount.isZero()) {
    return amount.toFixed(0);
  }

  const convertedAmount = amount.times(configuration.currency.precision);

  return convertedAmount.toFixed(0);
}

/**
 * Convert from base unit to unit of account (e.g. satoshis to bitcoins)
 * (TODO: refactor for a more proper conversion mechanism)
 * @param amount the amount (in base unit) to convert
 * @param decimalPlaces (optional) decimal precision
 * @returns the converted amount, in unit of account
 */
function toAccountUnit(amount: BigNumber, decimalPlaces?: number): string {
  if (amount.isZero()) {
    return amount.toFixed();
  }

  let convertedValue: BigNumber;
  if (configuration.currency.symbol === currencies.eth.symbol) {
    return (amount.toNumber() / configuration.currency.precision).toFixed(
      ETH_FIXED_PRECISION,
    );
  } else {
    convertedValue = amount.dividedBy(configuration.currency.precision);

    if (typeof decimalPlaces !== "undefined" && decimalPlaces) {
      return convertedValue.toFixed(decimalPlaces);
    }
  }

  return convertedValue.toFixed();
}

export {
  init,
  getJSON,
  retry,
  setNetwork,
  toUnprefixedCashAddress,
  toBaseUnit,
  toAccountUnit,
};
