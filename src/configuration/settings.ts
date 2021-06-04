import * as dotenv from "dotenv";
import { Currency } from "../models/currency";

// GENERAL
// -------
const VERBOSE = false;

// CHECK BALANCES
// --------------

// Providers
// (use {coin} and {address} as placeholders for the coin name and the address)
const DEFAULT_API_URLS = {
  general: "https://sochain.com/api/v2/address/{coin}/{address}",
  bch: "https://rest.bitcoin.com/v2/address/{type}/bitcoincash:{address}",
};

const CUSTOM_API_URL =
  "https://rest.cryptoapis.io/v2/blockchain-data/{coin}/{network}/addresses/{address}";

// max number of addresses to probe when checking a possible gap between derivation indices
// (that is: range of indices not used for derivation)
const DEFAULT_GAP_LIMIT = 20;

// XPUB <> ADDRESS COMPARISON
// --------------------------

// scope of the derivation for the comparison
// only concerning xpub-search
const DERIVATION_SCOPE = {
  // _quick search_
  // the common range from which addresses
  // are generally derived
  quick_search: {
    account: {
      min: 0,
      max: 4,
    },
    index: {
      min: 0,
      max: 1000,
    },
  },

  // _deep search_
  // an extended range for a deeper analysis,
  // initiated when quick search fails
  deep_search: {
    account: {
      min: 0,
      max: 1000,
    },
    index: {
      min: 0,
      max: 100000,
    },
  },
};

// HTML REPORT
// -----------
const EXTERNAL_EXPLORERS_URLS = {
  general: "https://live.blockcypher.com/{coin}/{type}/{item}",
  bch: "https://blockchair.com/{coin}/{type}/{item}",
};

dotenv.config();
export const configuration = {
  currency: new Currency(),
  testnet: false,
  specificDerivationMode: "",
  externalProviderURL: "",
  APIKey: process.env.XPUB_SCAN_CUSTOM_API_KEY_V2,
  providerType: "default",
  silent: false,
  quiet: false,
  gap_limit: process.env.GAP_LIMIT || DEFAULT_GAP_LIMIT,
};

export {
  DEFAULT_API_URLS,
  CUSTOM_API_URL,
  VERBOSE,
  DERIVATION_SCOPE,
  EXTERNAL_EXPLORERS_URLS,
};
