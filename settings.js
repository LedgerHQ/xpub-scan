const coininfo = require('coininfo');

// GENERAL
// -------

const VERBOSE = false;

// CHECK BALANCES
// --------------

const BITCOIN_API = 'https://sochain.com/api/v2/address/BTC/';

const LITECOIN_API = 'https://sochain.com/api/v2/address/LTC/';

// max number of addresses to probe when checking a possible gap between derivation indices
// (that is: range of indices not used for derivation)
const MAX_EXPLORATION = 20;

// number of addresses to pre-generate (used for transactions analysis)
const ADDRESSES_PREGENERATION = 2000;


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

const AddressType = { 
  LEGACY: "Legacy",
  NATIVE: "Native SegWit",
  SEGWIT: "SegWit",
  LEGACY_OR_SEGWIT: "Legacy/SegWit",
  ALL: "All"
};

Object.freeze(AddressType);

module.exports = { 
  AddressType, 
  BITCOIN_API, 
  LITECOIN_API,
  MAX_EXPLORATION, 
  VERBOSE, 
  ADDRESSES_PREGENERATION,
  BITCOIN_NETWORK,
  LITECOIN_NETWORK,
  DERIVATION_SCOPE
}