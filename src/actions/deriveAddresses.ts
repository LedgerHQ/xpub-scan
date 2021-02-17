import * as bjs from "bitcoinjs-lib";
import * as bip32 from 'bip32';

import { AddressType, network } from "../settings";

// derive legacy address at account and index positions
function getLegacyAddress(xpub: string, account: number, index: number) : string {
  const { address } = bjs.payments.p2pkh({
    pubkey: bip32
      .fromBase58(xpub, network.type)
      .derive(account)
      .derive(index).publicKey,
    network: network.type
  });
  
  return String(address);
}

// derive native SegWit at account and index positions
function getNativeSegWitAddress(xpub: string, account: number, index: number) : string {
  const { address } = bjs.payments.p2wpkh({
    pubkey: bip32
      .fromBase58(xpub, network.type)
      .derive(account)
      .derive(index).publicKey,
    network: network.type
  });
  
  return String(address);
}

// derive SegWit at account and index positions
function getSegWitAddress(xpub: string, account: number, index: number) : string {
  const { address } = bjs.payments.p2sh({
    redeem: bjs.payments.p2wpkh({
      pubkey: bip32
        .fromBase58(xpub, network.type)
        .derive(account)
        .derive(index).publicKey,
      network: network.type
    }),
  });
  
  return String(address);
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
  }

  throw new Error("Should not be reachable");
}

// infer address type from its syntax
function getAddressType(address: string) {
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
  
export { getAddressType, getAddress }