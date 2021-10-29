import * as dotenv from "dotenv";
import { Currency } from "../models/currency";

// GENERAL
// -------
const VERBOSE = false;
const ETH_FIXED_PRECISION = 10; // Decimal places for ETH (recommended for Crypto APIs provider: 10)

// CHECK BALANCES
// --------------

// Providers
// (use {coin} and {address} as placeholders for the coin name and the address)
const BLOCK_HEIGHT_API_URL = " https://sochain.com/api/v2/get_info/{coin}";

const DEFAULT_API_URLS = {
  general: "https://sochain.com/api/v2/address/{coin}/{address}",
  bch: "https://rest.bitcoin.com/v2/address/{type}/bitcoincash:{address}",
  eth: "https://api.blockcypher.com/v1/eth/main/{type}/{item}",
};

const CUSTOM_API_URL =
  "https://rest.cryptoapis.io/v2/blockchain-data/{coin}/{network}";

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
  eth: "https://etherscan.io/{type}/{item}",
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
  commandLineMode: false,
  gap_limit: process.env.GAP_LIMIT || DEFAULT_GAP_LIMIT,
  augmentedImport: false, // augmented JSON to compare smart contract interactions
  blockHeightUpperLimit: 0, // comparison mode: block height limit
};

export {
  BLOCK_HEIGHT_API_URL,
  DEFAULT_API_URLS,
  CUSTOM_API_URL,
  VERBOSE,
  ETH_FIXED_PRECISION,
  DERIVATION_SCOPE,
  EXTERNAL_EXPLORERS_URLS,
};
