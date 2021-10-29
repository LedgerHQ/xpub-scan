import * as bjs from "bitcoinjs-lib";
import * as bip32 from "bip32";
import bchaddr from "bchaddrjs";
import bitcore from "bitcore-lib-cash";

import { DerivationMode } from "../configuration/currencies";
import { configuration } from "../configuration/settings";

// derive legacy address at account and index positions
function getLegacyAddress(
  xpub: string,
  account: number,
  index: number,
): string {
  const { address } = bjs.payments.p2pkh({
    pubkey: bip32
      .fromBase58(xpub, configuration.currency.network)
      .derive(account)
      .derive(index).publicKey,
    network: configuration.currency.network,
  });

  return String(address);
}

// derive native SegWit at account and index positions
function getNativeSegWitAddress(
  xpub: string,
  account: number,
  index: number,
): string {
  const { address } = bjs.payments.p2wpkh({
    pubkey: bip32
      .fromBase58(xpub, configuration.currency.network)
      .derive(account)
      .derive(index).publicKey,
    network: configuration.currency.network,
  });

  return String(address);
}

// derive SegWit at account and index positions
function getSegWitAddress(
  xpub: string,
  account: number,
  index: number,
): string {
  const { address } = bjs.payments.p2sh({
    redeem: bjs.payments.p2wpkh({
      pubkey: bip32
        .fromBase58(xpub, configuration.currency.network)
        .derive(account)
        .derive(index).publicKey,
      network: configuration.currency.network,
    }),
  });

  return String(address);
}

// Based on https://github.com/go-faast/bitcoin-cash-payments/blob/54397eb97c7a9bf08b32e10bef23d5f27aa5ab01/index.js#L63-L73
function getLegacyBitcoinCashAddress(
  xpub: string,
  account: number,
  index: number,
): string {
  const node = new bitcore.HDPublicKey(xpub);
  const child = node.derive(account).derive(index);
  const address = new bitcore.Address(
    child.publicKey,
    bitcore.Networks.livenet,
  );
  const addrstr = address.toString().split(":");

  if (addrstr.length === 2) {
    return bchaddr.toLegacyAddress(addrstr[1]);
  } else {
    throw new Error("Unable to derive cash address for " + address);
  }
}

// get address given an address type
function getAddress(
  derivationMode: DerivationMode,
  xpub: string,
  account: number,
  index: number,
): string {
  switch (derivationMode) {
    case DerivationMode.LEGACY:
      return getLegacyAddress(xpub, account, index);
    case DerivationMode.SEGWIT:
      return getSegWitAddress(xpub, account, index);
    case DerivationMode.NATIVE:
      return getNativeSegWitAddress(xpub, account, index);
    case DerivationMode.BCH:
      return getLegacyBitcoinCashAddress(xpub, account, index);
  }

  throw new Error("Should not be reachable");
}

// infer address type from its syntax
//
// TODO: improve the prefix matching: make the expected prefix
// correspond to the actual type (currently, a `ltc1` prefix
// could match a native Bitcoin address type for instance)
function getDerivationMode(address: string) {
  if (address.match("^(bc1|tb1|ltc1).*")) {
    return DerivationMode.NATIVE;
  } else if (address.match("^(3|2|M).*")) {
    return DerivationMode.SEGWIT;
  } else if (address.match("^(1|n|m|L).*")) {
    return DerivationMode.LEGACY;
  } else {
    throw new Error(
      "INVALID ADDRESS: ".concat(address).concat(" is not a valid address"),
    );
  }
}

export { getDerivationMode, getAddress };
