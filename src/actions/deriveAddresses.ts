import * as bjs from "bitcoinjs-lib";
import * as bip32 from "bip32";

// @ts-ignore
import * as bch from "bitcoincashjs";
import bchaddr from "bchaddrjs";

import { AddressType } from "../configuration/currencies";
import { configuration } from "../configuration/settings";

// derive legacy address at account and index positions
function getLegacyAddress(xpub: string, account: number, index: number) : string {
  const { address } = bjs.payments.p2pkh({
    pubkey: bip32
      .fromBase58(xpub, configuration.network)
      .derive(account)
      .derive(index).publicKey,
    network: configuration.network
  });
  
  return String(address);
}

// derive native SegWit at account and index positions
function getNativeSegWitAddress(xpub: string, account: number, index: number) : string {
  const { address } = bjs.payments.p2wpkh({
    pubkey: bip32
      .fromBase58(xpub, configuration.network)
      .derive(account)
      .derive(index).publicKey,
    network: configuration.network
  });
  
  return String(address);
}

// derive SegWit at account and index positions
function getSegWitAddress(xpub: string, account: number, index: number) : string {
  const { address } = bjs.payments.p2sh({
    redeem: bjs.payments.p2wpkh({
      pubkey: bip32
        .fromBase58(xpub, configuration.network)
        .derive(account)
        .derive(index).publicKey,
      network: configuration.network
    }),
  });
  
  return String(address);
}

// Based on https://github.com/go-faast/bitcoin-cash-payments/blob/54397eb97c7a9bf08b32e10bef23d5f27aa5ab01/index.js#L63-L73
function getLegacyBitcoinCashAddress(xpub: string, account: number, index: number) : string {
  const CASH_ADDR_FORMAT = bch.Address.CashAddrFormat;

  const node = new bch.HDPublicKey(xpub);
  const child = node.derive(account).derive(index);
  const address = new bch.Address(child.publicKey, bch.Networks.livenet);
  const addrstr = address.toString(CASH_ADDR_FORMAT).split(":");
  if (addrstr.length === 2) {
    return bchaddr.toLegacyAddress(addrstr[1]);
  } else {
    throw new Error("Unable to derive cash address for " + address);
  }
}

// get address given an address type
function getAddress(addressType: AddressType, xpub: string, account: number, index: number) : string {
  switch(addressType) {
    case AddressType.LEGACY:
      return getLegacyAddress(xpub, account, index);
    case AddressType.SEGWIT:
      return getSegWitAddress(xpub, account, index);
    case AddressType.NATIVE:
      return getNativeSegWitAddress(xpub, account, index);
    case AddressType.BCH:
      return getLegacyBitcoinCashAddress(xpub, account, index);
  }

  throw new Error("Should not be reachable");
}

// infer address type from its syntax
//
// TODO: improve the prefix matching: make the expected prefix 
// correspond to the actual type (currently, a `ltc1` prefix 
// could match a native Bitcoin address type for instance)
function getAddressType(address: string) {
  if (address.match("^(bc1|ltc1).*")) {
    return AddressType.NATIVE;
  }
  else if (address.match("^(3|M).*")) {
    return AddressType.SEGWIT;
  }
  else if (address.match("^(1|L).*")) {
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
  
export { getAddressType, getAddress };
