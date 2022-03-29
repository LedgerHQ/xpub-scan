import * as dotenv from "dotenv";
import { Currency } from "../models/currency";

// ┏━━━━━━━━━┓
// ┃ GENERAL ┃
// ┗━━━━━━━━━┛

const VERBOSE = false;
const ETH_FIXED_PRECISION = 10; // Decimal places for ETH (recommended for Crypto APIs provider: 10)

// max number of addresses to probe when checking a possible gap between derivation indices
// (that is: range of indices not used for derivation)
const DEFAULT_GAP_LIMIT = 20;

// ┏━━━━━━━━━━━┓
// ┃ PROVIDERS ┃
// ┗━━━━━━━━━━━┛

// use {currency} and {address} as placeholders for the currency name and the address;
// {type} for the transaction type, and {item} for either an address or a transaction
const DEFAULT_API_URLS = {
  general: "https://sochain.com/api/v2/address/{currency}/{address}",
  bch: "https://rest.bitcoin.com/v2/address/{type}/bitcoincash:{address}",
  eth: "https://api.blockcypher.com/v1/eth/main/{type}/{item}",
};

// use {currency} and {network} as placeholders for the currency name and the network (mainnet v. testnet)
const CRYPTOAPIS_URL =
  "https://rest.cryptoapis.io/v2/blockchain-data/{currency}/{network}";

// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ XPUB <=> ADDRESS COMPARISON ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

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

// ┏━━━━━━━━━━━━━┓
// ┃ HTML REPORT ┃
// ┗━━━━━━━━━━━━━┛

const EXTERNAL_EXPLORERS_URLS = {
  general: "https://live.blockcypher.com/{currency}/{type}/{item}",
  bch: "https://blockchair.com/{currency}/{type}/{item}",
  eth: "https://etherscan.io/{type}/{item}",
};

// ┏━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ CONFIGURATION OBJECT ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━┛

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
  DEFAULT_API_URLS,
  CRYPTOAPIS_URL,
  VERBOSE,
  ETH_FIXED_PRECISION,
  DERIVATION_SCOPE,
  EXTERNAL_EXPLORERS_URLS,
};
