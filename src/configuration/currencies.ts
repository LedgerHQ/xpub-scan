import coininfo from "coininfo";

export enum DerivationMode {
  LEGACY = "Legacy",
  NATIVE = "Native SegWit",
  SEGWIT = "SegWit",
  TAPROOT = "Taproot",
  BCH = "Bitcoin Cash",
  ETHEREUM = "Ethereum",
  DOGECOIN = "Dogecoin",
  UNKNOWN = "Unknown",
}

export const currencies = {
  btc: {
    name: "Bitcoin",
    symbol: "BTC",
    network_mainnet: coininfo.bitcoin.main.toBitcoinJS(),
    network_testnet: coininfo.bitcoin.test.toBitcoinJS(),
    derivationModes: [
      DerivationMode.LEGACY,
      DerivationMode.SEGWIT,
      DerivationMode.NATIVE,
      DerivationMode.TAPROOT,
    ],
    precision: 10 ** 8,
    utxo_based: true,
  },
  bch: {
    name: "Bitcoin Cash",
    symbol: "BCH",
    network_mainnet: coininfo.bitcoincash.main.toBitcoinJS(),
    network_testnet: coininfo.bitcoincash.test.toBitcoinJS(),
    derivationModes: [DerivationMode.BCH],
    precision: 10 ** 8,
    utxo_based: true,
  },
  ltc: {
    name: "Litecoin",
    symbol: "LTC",
    network_mainnet: coininfo.litecoin.main.toBitcoinJS(),
    network_testnet: coininfo.litecoin.test.toBitcoinJS(),
    derivationModes: [
      DerivationMode.LEGACY,
      DerivationMode.SEGWIT,
      DerivationMode.NATIVE,
    ],
    precision: 10 ** 8,
    utxo_based: true,
  },
  eth: {
    name: "Ethereum",
    symbol: "ETH",
    precision: 10 ** 18,
    utxo_based: false,
    derivationModes: [DerivationMode.ETHEREUM],
  },
  doge: {
    name: "Dogecoin",
    symbol: "DOGE",
    network_mainnet: coininfo.dogecoin.main.toBitcoinJS(),
    network_testnet: coininfo.dogecoin.test.toBitcoinJS(),
    precision: 10 ** 8,
    utxo_based: true,
    derivationModes: [DerivationMode.DOGECOIN],
  },
};
