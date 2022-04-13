import * as bjs from "bitcoinjs-lib";
import bchaddr from "bchaddrjs";
import bitcore from "bitcore-lib-cash";
import Wallet from "ethereumjs-wallet";
import { bech32, bech32m } from "bech32";
import { publicKeyTweakAdd } from "secp256k1";
import createHmac from "create-hmac";

import { DerivationMode } from "../configuration/currencies";
import { configuration } from "../configuration/settings";

import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
import bs58 from "bs58check";

const bip32 = BIP32Factory(ecc);

class BIP32 {
  publicKey: any;
  chainCode: any;
  network: any;
  depth: number;
  index: number;
  constructor(
    publicKey: any,
    chainCode: any,
    network: any,
    depth = 0,
    index = 0,
  ) {
    this.publicKey = publicKey;
    this.chainCode = chainCode;
    this.network = network;
    this.depth = depth;
    this.index = index;
  }
  derive(index: number) {
    const data = Buffer.allocUnsafe(37);
    this.publicKey.copy(data, 0);
    data.writeUInt32BE(index, 33);
    const I = createHmac("sha512", this.chainCode).update(data).digest();
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    const Ki = Buffer.from(publicKeyTweakAdd(this.publicKey, IL));
    return new BIP32(Ki, IR, this.network, this.depth + 1, index);
  }
}

const getPubkeyAt = (xpub: string, account: number, index: number) => {
  const buffer = Buffer.from(bs58.decode(xpub));
  const depth = buffer[4];
  const i = buffer.readUInt32BE(9);
  const chainCode = buffer.slice(13, 45);
  const publicKey = buffer.slice(45, 78);

  return new BIP32(
    publicKey,
    chainCode,
    configuration.currency.network,
    depth,
    i,
  )
    .derive(account)
    .derive(index).publicKey;
};

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
  const publicKeyBuffer: Buffer = getPubkeyAt(xpub, account, index);

  const publicKeyHash160: Buffer = bjs.crypto.hash160(publicKeyBuffer);

  return bjs.address.toBase58Check(
    publicKeyHash160,
    configuration.currency.network!.pubKeyHash,
  );
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
 * derive a taproot address at a given account and index positions
 * Based on https://github.com/cryptocoinjs/coininfo/blob/master/lib/coins/btc.js
 * @param xpub the xpub from which to derive the taproot address
 * @param account account number from which to derive the taproot address
 * @param index index number from which to derive the taproot address
 * @returns the derived taproot address
 */
function getTaprootAddress(
  xpub: string,
  account: number,
  index: number,
): string {
  const taprootNetworkPrefix = "bc";

  const getSchnorrInternalPubkeyAt = (
    xpub: string,
    account: number,
    index: number,
  ): Buffer => {
    const buffer = Buffer.from(bs58.decode(xpub));
    const depth = buffer[4];
    const i = buffer.readUInt32BE(9);
    const chainCode = buffer.slice(13, 45);
    const publicKey = buffer.slice(45, 78);

    const publicKeyAt = new BIP32(
      publicKey,
      chainCode,
      taprootNetworkPrefix,
      depth,
      i,
    )
      .derive(account)
      .derive(index).publicKey;

    const schnorrInternalPubkeyAt = publicKeyAt.slice(1);

    return schnorrInternalPubkeyAt;
  };

  const hashTapTweak = (schnorrInternalPubkey: Buffer): Buffer => {
    // hash_tag(x) = SHA256(SHA256(tag) || SHA256(tag) || x), see BIP340
    // See https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki#specification
    const h = bjs.crypto.sha256(Buffer.from("TapTweak", "utf-8"));
    return bjs.crypto.sha256(Buffer.concat([h, h, schnorrInternalPubkey]));
  };

  const toBech32 = (outputSchnorrKey: Buffer): string => {
    const words = bech32.toWords(outputSchnorrKey);
    words.unshift(1);

    return bech32m.encode(taprootNetworkPrefix, words);
  };

  const schnorrInternalPubkey = getSchnorrInternalPubkeyAt(
    xpub,
    account,
    index,
  );

  const evenEcdsaPubkey = Buffer.concat([
    Buffer.from([0x02]),
    schnorrInternalPubkey,
  ]);

  const tweak = hashTapTweak(schnorrInternalPubkey);

  // Q = P + int(hash_TapTweak(bytes(P)))G
  const outputEcdsaKey = Buffer.from(publicKeyTweakAdd(evenEcdsaPubkey, tweak));

  // Convert to schnorr
  const outputSchnorrKey = outputEcdsaKey.slice(1);

  // Create address
  return String(toBech32(outputSchnorrKey));
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
    case DerivationMode.TAPROOT:
      return getTaprootAddress(xpub, account, index);
    case DerivationMode.BCH:
      return getLegacyBitcoinCashAddress(xpub, account, index);
    case DerivationMode.DOGECOIN:
      return getLegacyAddress(xpub, account, index);
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
 */

function getDerivationMode(address: string) {
  if (address.match("^(bc1q|tb1|ltc1).*")) {
    return DerivationMode.NATIVE;
  } else if (address.match("^(bc1p).*")) {
    return DerivationMode.TAPROOT;
  } else if (address.match("^[32M].*")) {
    return DerivationMode.SEGWIT;
  } else if (address.match("^[1nmL].*")) {
    return DerivationMode.LEGACY;
  } else if (address.match("^(D).*")) {
    return DerivationMode.DOGECOIN;
  } else {
    throw new Error(
      "INVALID ADDRESS: "
        .concat(address)
        .concat(" is not a valid or a supported address"),
    );
  }
}

export { getDerivationMode, deriveAddress };
