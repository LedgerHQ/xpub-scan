const bjs = require('bitcoinjs-lib');
const bip32 = require('bip32');

const { AddressType } = require('../settings');

class Address {
  constructor(type, xpub, account, index) {
    this.address = getAddress(type, xpub, account, index);
    this.type = type;
    this.account = account;
    this.index = index;
  }
  
  setTransactions(transactions) {
    this.transactions = transactions;
  }
  
  setRawTransactions(rawTransactions) {
    this.rawTransactions = rawTransactions;
  }
  
  setBalance(balance) {
    this.balance = balance;
  }
  
  setStats(stats) {
    this.stats = stats;
  }
  
  setFunded(funded) {
    this.funded = funded;
  }
  
  getFunded() {
    return this.funded;
  }
  
  setSent(sent) {
    this.sent = sent;
  }
  
  getSent() {
    return this.sent;
  }
  
  toString() {
    return this.address;
  }
  
  getType() {
    return this.type;
  }
  
  getDerivation() {
    return {
      account: this.account,
      index: this.index
    }
  }
  
  getBalance() {
    return this.balance;
  }
  
  getStats() {
    return this.stats
  }
  
  getTransactions() {
    return this.transactions;
  }
  
  getRawTransactions() {
    return this.rawTransactions;
  }
}

// derive legacy address at account and index positions
function getLegacyAddress(xpub, account, index) {
  const { address } = bjs.payments.p2pkh({
    pubkey: bip32
      .fromBase58(xpub, global.network)
      .derive(account)
      .derive(index).publicKey,
    network: global.network
  });
  
  return address;
}

// derive native SegWit at account and index positions
function getNativeSegWitAddress(xpub, account, index) {
  const { address } = bjs.payments.p2wpkh({
    pubkey: bip32
      .fromBase58(xpub, global.network)
      .derive(account)
      .derive(index).publicKey,
    network: global.network
  });
  
  return address;
}

// derive SegWit at account and index positions
function getSegWitAddress(xpub, account, index) {
  const { address } = bjs.payments.p2sh({
    redeem: bjs.payments.p2wpkh({
      pubkey: bip32
        .fromBase58(xpub, global.network)
        .derive(account)
        .derive(index).publicKey,
      network: global.network
    }),
  });
  
  return address;
}

// get address given an address type
function getAddress(addressType, xpub, account, index) {
  switch(addressType) {
    case AddressType.LEGACY:
      return getLegacyAddress(xpub, account, index);
    case AddressType.SEGWIT:
      return getSegWitAddress(xpub, account, index);
    case AddressType.NATIVE:
      return getNativeSegWitAddress(xpub, account, index);
    case AddressType.ALL:
      return [
        {
          type: AddressType.LEGACY,
          address: getLegacyAddress(xpub, account, index)
        },
        {
          type: AddressType.SEGWIT,
          address: getSegWitAddress(xpub, account, index)
        },
        {
          type: AddressType.NATIVE,
          address: getNativeSegWitAddress(xpub, account, index)
        }
      ];
  }
}

// infer address type from its syntax
function getAddressType(address) {
  if (address.match('^(bc1|ltc1).*')) {
    return AddressType.NATIVE;
  }
  else if (address.match('^(3|M).*')) {
    return AddressType.SEGWIT;
  }
  else if (address.match('^(1|L).*')) {
    return AddressType.LEGACY;
  }
  else {
    throw new Error(
      "INVALID ADDRESS: "
      .concat(address)
      .concat(" is not a valid address")
      );
    }
  }
  
  module.exports = { Address, getAddressType, getAddress }