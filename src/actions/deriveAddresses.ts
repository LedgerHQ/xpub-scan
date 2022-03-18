import * as bjs from "bitcoinjs-lib";
import bchaddr from "bchaddrjs";
import bitcore from "bitcore-lib-cash";
import Wallet from "ethereumjs-wallet";

import { DerivationMode } from "../configuration/currencies";
import { configuration } from "../configuration/settings";

import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";

const bip32 = BIP32Factory(ecc);

/**
 * derive a legacy address at a given account and index positions
 * @param xpub the xpub from which to derive the legacy address
 * @param account account number from which to derive the legacy address
 * @param index index number from which to derive the legacy address
 * @returns the derived legacy address
 */
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

/**
 * derive a SegWit address at a given account and index positions
 * @param xpub the xpub from which to derive the SegWit address
 * @param account account number from which to derive the SegWit address
 * @param index index number from which to derive the SegWit address
 * @returns the derived SegWit address
 */
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

/**
 * derive a native SegWit address at a given account and index positions
 * @param xpub the xpub from which to derive the native SegWit address
 * @param account account number from which to derive the native SegWit address
 * @param index index number from which to derive the native SegWit address
 * @returns the derived native SegWit address
 */
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

/**
 * derive a Bitcoin Cash address at a given account and index positions
 * @param xpub the xpub from which to derive the Bitcoin Cash address
 * @param account account number from which to derive the Bitcoin Cash address
 * @param index index number from which to derive the Bitcoin Cash address
 * @returns the derived Bitcoin Cash address
 * note: based on https://github.com/go-faast/bitcoin-cash-payments/blob/54397eb97c7a9bf08b32e10bef23d5f27aa5ab01/index.js#L63-L73
 */
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

/**
 * derive a unique Ethereum address (the first one)
 * @param xpub the xpub from which to derive the Ethereum address
 * @returns the first derived Ethereum address
 */
function getEthereumAddress(xpub: string): string {
  return Wallet.fromExtendedPublicKey(xpub).getAddressString();
}

/**
 * derive an address at a given account and index positions
 * @param derivationMode the derivation mode used to derive the address
 * @param xpub the xpub from which to derive the address
 * @param account account number from which to derive the address
 * @param index index number from which to derive the address
 * @returns the derived address
 */
function deriveAddress(
  derivationMode: DerivationMode,
  xpub: string,
  account?: number,
  index?: number,
): string {
  if (typeof account === "undefined") {
    account = 0;
  }

  if (typeof index === "undefined") {
    index = 0;
  }

  switch (derivationMode) {
    case DerivationMode.LEGACY:
      return getLegacyAddress(xpub, account, index);
    case DerivationMode.SEGWIT:
      return getSegWitAddress(xpub, account, index);
    case DerivationMode.NATIVE:
      return getNativeSegWitAddress(xpub, account, index);
    case DerivationMode.BCH:
      return getLegacyBitcoinCashAddress(xpub, account, index);
    case DerivationMode.ETHEREUM:
      return getEthereumAddress(xpub);
    case DerivationMode.UNKNOWN:
    /* fallthrough */
    default:
      throw new Error("Unknown derivation mode");
  }
}

/**
 * infer the derivation mode from the address syntax
 * @param address any address (Bitcoin, Ethereum, etc.)
 * @returns the derivation mode associated with the address
 *
 * TODO: improve the prefix matching: make the expected prefix
 * correspond to the actual type (currently, a `ltc1` prefix
 * could match a native Bitcoin address type for instance)
 */

function getDerivationMode(address: string) {
  if (address.match("^(bc1|tb1|ltc1).*")) {
    return DerivationMode.NATIVE;
  } else if (address.match("^(3|2|M).*")) {
    return DerivationMode.SEGWIT;
  } else if (address.match("^(1|n|m|L).*")) {
    return DerivationMode.LEGACY;
  } else {
    throw new Error(
      "INVALID ADDRESS: "
        .concat(address)
        .concat(" is not a valid or a supported address"),
    );
  }
}

export { getDerivationMode, deriveAddress };
