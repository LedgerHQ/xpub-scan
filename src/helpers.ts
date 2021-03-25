import request from "sync-request";

import * as bip32 from 'bip32';
import chalk from "chalk";

import { 
  NETWORKS,
  configuration 
} from "./settings";

// TODO: properly rework this function
function getJSON(url: string, APIKey?: string) {
  let headers = {};

  if (APIKey !== undefined) {
    headers = {
      'X-API-Key': APIKey
    }
  }

  const res = request('GET', url, {headers} );

  if (res.statusCode !== 200) {
    console.log(chalk.red('GET request error'));
    throw new Error(
      "GET REQUEST ERROR: "
        .concat(url)
        .concat(", Status Code: ")
        .concat(String(res.statusCode))
      );
  }

  return JSON.parse(res.getBody('utf-8'));
}

function setNetwork(xpub: string, currency?: string) {
  if (typeof(currency) === 'undefined') {
    const prefix = xpub.substring(0, 4);
  
    if (prefix === 'xpub') {
      configuration.network = NETWORKS.bitcoin_mainnet;
      configuration.currency = 'Bitcoin';
      configuration.symbol = 'BTC';
    }
    else if (prefix === 'Ltub') {
      configuration.network = NETWORKS.litecoin_mainnet;
      configuration.currency = 'Litecoin';
      configuration.symbol = 'LTC';
    }
    else {
      throw new Error("INVALID XPUB: " + xpub + " has not a valid prefix");
    }
  }
  else {
    currency = currency.toLowerCase()
    // Bitcoin Cash
    if (currency.includes('cash') || currency === 'bch') {
      configuration.network = NETWORKS.bitcoin_cash_mainnet;
      configuration.currency = 'Bitcoin Cash';
      configuration.symbol = 'BCH';
      return;
    }

    throw new Error("INVALID CURRENCY: '" + currency + "' is not supported");
  }
}

// ensure that the xpub is a valid one
// and select the relevant network
//
// TODO: extend to ypub, zpub...
function checkXpub(xpub: string) {
  try {
    bip32.fromBase58(xpub, configuration.network);
  }
  catch (e) {
    throw new Error("INVALID XPUB: " + xpub + " is not a valid xpub -- " + e);
  }

  if (typeof(configuration.APIKey) !== 'undefined' && configuration.APIKey.length > 0) {
    configuration.providerType = 'custom';
  }

  if (configuration.quiet) {
    return;
  }

  console.log(
    chalk.grey(
      '(Data fetched from the '
      .concat(chalk.bold(configuration.providerType))
      .concat(' provider)')
    )
  );
}

function init(xpub: string, quiet: boolean, currency?: string) {
  configuration.quiet = quiet;
  setNetwork(xpub, currency);
  checkXpub(xpub);
}

export {
  getJSON,
  init
}
