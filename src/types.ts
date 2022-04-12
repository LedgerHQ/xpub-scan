// eslint-disable-next-line @typescript-eslint/no-explicit-any
import BigNumber from "bignumber.js";
import { DerivationMode } from "./configuration/currencies";
import { ScanLimits } from "./models/scanLimits";
import { Address } from "./models/address";
import { Operation } from "./models/operation";
import { Comparison } from "./models/comparison";

export interface ScannerArguments {
  _?: string;
  itemToScan: string;
  balanceOnly: boolean;
  scanLimits?: ScanLimits;
  currency?: string;
  testnet?: boolean;
  account?: number;
  index?: number;
  fromIndex?: number;
  toIndex?: number;
  preDerivationSize?: number;
  address?: string;
  derivationMode?: string;
  silent?: boolean;
  quiet?: boolean;
  diff?: boolean;
  import?: string;
  addresses?: string;
  balance?: string;
  utxos?: string;
  operations?: string;
  save?: string;
  customProvide?: boolean;
}

export interface ScanResult {
  meta?: ScanMeta;
  data?: ScanData;
  exitCode: number;
}

export interface ScanMeta {
  xpub: string;
  date: Date;
  version: string;
  mode: string;
  preDerivationSize?: number;
  derivationMode: string;
  balanceOnly: boolean;
}

export interface ScanData {
  summary: Array<Summary>;
  addresses: Array<Address>;
  transactions: Array<Operation>;
  comparisons?: Array<Comparison>;
}

export interface Summary {
  derivationMode: DerivationMode;
  balance: BigNumber;
}
