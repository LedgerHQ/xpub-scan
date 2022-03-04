import * as bjs from "bitcoinjs-lib";
import bchaddr from "bchaddrjs";
import bitcore from "bitcore-lib-cash";
import Wallet from "ethereumjs-wallet";
import { bech32, bech32m } from "bech32";
import bs58 from "bs58";
import { publicKeyTweakAdd } from "secp256k1";
import createHmac from "create-hmac";

import { DerivationMode } from "../configuration/currencies";
import { configuration } from "../configuration/settings";

import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";

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

// derive taproot at account and index positions
// Based on https://github.com/cryptocoinjs/coininfo/blob/master/lib/coins/btc.js
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

// derive unique address from Ethereum xpub
function getEthereumAddress(xpub: string): string {
  return Wallet.fromExtendedPublicKey(xpub).getAddressString();
}

// get address given an address type
function getAddress(
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
    case DerivationMode.ETHEREUM:
      return getEthereumAddress(xpub);
    case DerivationMode.UNKNOWN:
    /* fallthrough */
    default:
      throw new Error("Unknown derivation mode");
  }
}

// infer address type from its syntax
//
// TODO: improve the prefix matching: make the expected prefix
// correspond to the actual type (currently, a `ltc1` prefix
// could match a native Bitcoin address type for instance)
function getDerivationMode(address: string) {
  if (address.match("^(bc1q|tb1|ltc1).*")) {
    return DerivationMode.NATIVE;
  } else if (address.match("^(bc1p).*")) {
    return DerivationMode.TAPROOT;
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

export { getDerivationMode, getAddress };
