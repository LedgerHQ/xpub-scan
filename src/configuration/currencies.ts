import coininfo from "coininfo";

export enum AddressType {
  LEGACY = "Legacy",
  NATIVE = "Native SegWit",
  SEGWIT = "SegWit",
  BCH = "Bitcoin Cash",
}
Object.freeze(AddressType);

// TODO: complete migratation from settings to currencies
export const currencies = {
  btc_mainnet: {
    name: "Bitcoin Mainnet",
    symbol: "BTC",
    network: coininfo.bitcoin.main.toBitcoinJS(),
    types: [AddressType.LEGACY, AddressType.SEGWIT, AddressType.NATIVE],
    precision: 100000000,
  },
  btc_tesnet: {
    name: "Bitcoin Testnet",
    symbol: "BTC",
    network: coininfo.bitcoin.test.toBitcoinJS(),
    types: [AddressType.LEGACY, AddressType.SEGWIT, AddressType.NATIVE],
    precision: 100000000,
  },
  bch_mainnet: {
    name: "Bitcoin Cash Mainnet",
    symbol: "BCH",
    network: coininfo.bitcoincash.main.toBitcoinJS(),
    types: [AddressType.BCH],
    precision: 100000000,
  },
  bch_tesnet: {
    name: "Bitcoin Cash Testnet",
    symbol: "BCH",
    network: coininfo.bitcoincash.test.toBitcoinJS(),
    types: [AddressType.BCH],
    precision: 100000000,
  },
  ltc_mainnet: {
    name: "Litecoin Mainnet",
    symbol: "LTC",
    network: coininfo.litecoin.main.toBitcoinJS(),
    types: [AddressType.LEGACY, AddressType.SEGWIT, AddressType.NATIVE],
    precision: 100000000,
  },
  ltc_tesnet: {
    name: "Litecoin Testnet",
    symbol: "LTC",
    network: coininfo.litecoin.test.toBitcoinJS(),
    types: [AddressType.LEGACY, AddressType.SEGWIT, AddressType.NATIVE],
    precision: 100000000,
  },
};
