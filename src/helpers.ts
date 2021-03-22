import request from "sync-request";

import * as bip32 from 'bip32';
import chalk from "chalk";

import { 
  BITCOIN_NETWORK, 
  BITCOIN_CASH_NETWORK, 
  LITECOIN_NETWORK,
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
      configuration.network = BITCOIN_NETWORK;
      configuration.currency = 'Bitcoin'
    }
    else if (prefix === 'Ltub') {
      configuration.network = LITECOIN_NETWORK;
      configuration.currency = 'Litecoin'
    }
    else {
      throw new Error("INVALID XPUB: " + xpub + " has not a valid prefix");
    }
  }
  else {
    // Bitcoin Cash
    if (currency.toLowerCase().includes('cash')) {
      configuration.network = BITCOIN_CASH_NETWORK;
      configuration.currency = 'Bitcoin Cash'
    }
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
