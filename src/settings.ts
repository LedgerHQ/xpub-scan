// @ts-ignore
import coininfo from "coininfo";
import * as dotenv from "dotenv";

// GENERAL
// -------

const VERBOSE = false;

// CHECK BALANCES
// --------------

// Providers
// (use {coin} and {address} as placeholders for the coin name and the address)

const DEFAULT_API_URL = 'https://sochain.com/api/v2/address/{coin}/{address}';

// max number of addresses to probe when checking a possible gap between derivation indices
// (that is: range of indices not used for derivation)
const MAX_EXPLORATION = 20;

// XPUB <> ADDRESS COMPARISON
// --------------------------

// scope of the derivation for the comparison
const DERIVATION_SCOPE = {

  // _quick search_
  // the common range from which addresses
  // are generally derived
  quick_search: {
    account: {
      min: 0,
      max: 4
    },
    index: {
      min: 0,
      max: 1000
    }
  },

  // _deep search_
  // an extended range for a deeper analysis,
  // initiated when quick search fails
  deep_search: {
    account: {
      min: 0,
      max: 1000
    },
    index: {
      min: 0,
      max: 100000
    }
  }
}


// DERIVATION PARAMETERS
// ---------------------

const BITCOIN_NETWORK = coininfo.bitcoin.main.toBitcoinJS()

const LITECOIN_NETWORK = coininfo.litecoin.main.toBitcoinJS();

export enum AddressType {
  LEGACY = "Legacy",
  NATIVE = "Native SegWit",
  SEGWIT = "SegWit"
}

Object.freeze(AddressType);

dotenv.config();
export const configuration = {
  network: undefined, 
  currency: '', 
  BaseURL: process.env.API_URL || DEFAULT_API_URL,
  APIKey: process.env.API_KEY,
  providerType: 'default'
};

export {
  DEFAULT_API_URL,
  MAX_EXPLORATION,
  VERBOSE,
  BITCOIN_NETWORK,
  LITECOIN_NETWORK,
  DERIVATION_SCOPE,
}
