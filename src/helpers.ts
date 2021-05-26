import axios from "axios";
import * as bip32 from "bip32";
import chalk from "chalk";
import bchaddr from "bchaddrjs";

import { configuration, DEFAULT_API_URLS } from "./configuration/settings";
import { currencies } from "./configuration/currencies";

export async function getJSON<T>(
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

export async function retry<T>(
  job: () => Promise<T>,
  { retries = 5, retryDelayMS = 0 } = {},
): Promise<T> {
  let err: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await job();
      return res;
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
    currency === "LTC"
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
 * Configure the external provider URL (i.e., default v. custom provider)
 * @param  {string} currency?
 *          Symbol of the currency (e.g. 'BCH')
 * @returns void
 */
const setExternalProviderURL = (): void => {
  // custom provider (i.e., API key is set)
  if (
    process.env.XPUB_SCAN_CUSTOM_API_URL &&
    process.env.XPUB_SCAN_CUSTOM_API_KEY
  ) {
    configuration.externalProviderURL =
      process.env.XPUB_SCAN_CUSTOM_API_URL.replace(
        "{network}",
        configuration.testnet ? "testnet" : "mainnet",
      );

    configuration.providerType = "custom";

    return;
  }

  // default provider
  const currency = configuration.currency;
  if (
    currency.symbol === currencies.btc.symbol ||
    currency.symbol === currencies.ltc.symbol
  ) {
    configuration.externalProviderURL = DEFAULT_API_URLS.general;
    return;
  }

  if (currency.symbol === currencies.bch.symbol) {
    configuration.externalProviderURL = DEFAULT_API_URLS.bch;
    return;
  }
};

// ensure that the xpub is a valid one
// and select the relevant network
//
// TODO: extend to ypub, zpub...
function checkXpub(xpub: string) {
  try {
    bip32.fromBase58(xpub, configuration.currency.network);
  } catch (e) {
    throw new Error("INVALID XPUB: " + xpub + " is not a valid xpub -- " + e);
  }

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

export function init(
  xpub: string,
  silent: boolean,
  quiet: boolean,
  currency?: string,
  testnet?: boolean,
  derivationMode?: string,
) {
  configuration.silent = silent;
  configuration.quiet = quiet;

  setNetwork(xpub, currency, testnet);
  setExternalProviderURL();

  if (configuration.currency.utxo_based) {
    checkXpub(xpub);
  }

  configuration.specificDerivationMode = derivationMode!;
}

// remove prefixes (`bitcoincash:`) from Bitcoin Cash addresses
export function toUnprefixedCashAddress(address: string) {
  if (configuration.currency.symbol !== currencies.bch.symbol) {
    return undefined;
  }

  if (!bchaddr.isCashAddress(address)) {
    address = bchaddr.toCashAddress(address);
  }

  return address.replace("bitcoincash:", "");
}
