// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { ScanLimits } from "./models/scanLimits";

export type TODO_TypeThis = any;

export interface ScannerArguments {
  _?: string;
  itemToScan: string;
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
  balance?: number;
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
}

export interface ScanData {
  summary: TODO_TypeThis[];
  addresses: TODO_TypeThis[];
  transactions: TODO_TypeThis[];
  comparisons: TODO_TypeThis;
}
