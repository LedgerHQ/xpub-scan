import coininfo from "coininfo";

export enum DerivationMode {
  LEGACY = "legacy",
  NATIVE = "native",
  SEGWIT = "segwit",
  BCH = "bch",
  UNKNOWN = "Unknown",
}

// TODO: complete migratation from settings to currencies
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
    ],
    precision: 100000000,
  },
  bch: {
    name: "Bitcoin Cash",
    symbol: "BCH",
    network_mainnet: coininfo.bitcoincash.main.toBitcoinJS(),
    network_testnet: coininfo.bitcoincash.test.toBitcoinJS(),
    derivationModes: [DerivationMode.BCH],
    precision: 100000000,
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
    precision: 100000000,
  },
};
