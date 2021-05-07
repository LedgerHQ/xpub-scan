import axios from "axios";
import * as bip32 from "bip32";
import chalk from "chalk";
import bchaddr from "bchaddrjs";

import { configuration, DEFAULT_API_URLS } from "./configuration/settings";
import { currencies } from "./configuration/currencies";

async function getJSON<T>(url: string, APIKey?: string): Promise<T> {
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
}

function setNetwork(xpub: string, currency?: string) {
  if (
    typeof currency === "undefined" ||
    currency === "BTC" ||
    currency === "LTC"
  ) {
    const prefix = xpub.substring(0, 4);

    if (prefix === "xpub") {
      configuration.network = currencies.btc_mainnet.network;
      configuration.currency = "Bitcoin";
      configuration.symbol = "BTC";
    } else if (prefix === "Ltub") {
      configuration.network = currencies.ltc_mainnet.network;
      configuration.currency = "Litecoin";
      configuration.symbol = "LTC";
    } else {
      throw new Error("INVALID XPUB: " + xpub + " has not a valid prefix");
    }
  } else {
    // Bitcoin Cash
    if (currency.includes("cash") || currency === "BCH") {
      configuration.network = currencies.bch_mainnet.network;
      configuration.currency = "Bitcoin Cash";
      configuration.symbol = "BCH";
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
const setExternalProviderURL = (currency?: string): void => {
  // custom provider (i.e., API key is set)
  if (
    process.env.XPUB_SCAN_CUSTOM_API_URL &&
    process.env.XPUB_SCAN_CUSTOM_API_KEY
  ) {
    configuration.externalProviderURL = process.env.XPUB_SCAN_CUSTOM_API_URL;
    configuration.providerType = "custom";
    return;
  }

  // default provider
  if (!currency) {
    configuration.externalProviderURL = DEFAULT_API_URLS.general;
    return;
  }

  if (currency === "BCH") {
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
    bip32.fromBase58(xpub, configuration.network);
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

function init(
  xpub: string,
  silent: boolean,
  quiet: boolean,
  currency?: string,
) {
  configuration.silent = silent;
  configuration.quiet = quiet;

  setNetwork(xpub, currency);
  setExternalProviderURL(currency);
  checkXpub(xpub);
}

// remove prefixes (`bitcoincash:`) from Bitcoin Cash addresses
function toUnprefixedCashAddress(address: string) {
  if (configuration.symbol !== "BCH") {
    return undefined;
  }

  if (!bchaddr.isCashAddress(address)) {
    address = bchaddr.toCashAddress(address);
  }

  return address.replace("bitcoincash:", "");
}

export { getJSON, init, toUnprefixedCashAddress };
