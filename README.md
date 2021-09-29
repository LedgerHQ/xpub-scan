# Xpub Scan

![XPUB](./doc/logo.png)

Given a master public key (xpub, Ltub, _etc._), get the balances of its derived legacy, native SegWit, and SegWit addresses, or check whether an address has been derived from it.

![Example](./doc/demo_balance.gif)

## Features

- Privacy Friendly: master public keys are never sent over the Internet: only their derived addresses are
- Derives specific addresses (by account+index) or all active ones
- Searches if a given address has been derived from a given master public key (perfect and partial match)
- Supports legacy, SegWit, and Native SegWit
- Automatically checks some categories of CSV files containing operations history

## Prerequisites

- Node.js
- Docker (if you want to use the docker image)

## Install

With yarn:

```
$ yarn global add @ledgerhq/xpub-scan
```

With npm:

```
$ npm i -g @ledgerhq/xpub-scan
```

## Usage

```
$ xpub-scan [options] <xpub>
```

Running programmatically example:

```
import { Scanner } from "../src/actions/scanner";

const scanResult = async (xpub: string) => {
  await new Scanner({ itemToScan: xpub }).scan();
};

scanResult("your_xpub");
```

## Development

Install dependencies:

```
$ yarn
```

Build the project

```
$ yarn build
```

Run the built version:

```
$ node ./lib/scan.js [options] <xpub>
```

_Alternatively, if you want to use the locally-built version of xpub-scan with just `xpub-scan` command, you can:_

```
$ yarn link
```

### Currencies

By default, Bitcoin xpubs and Litecoin ltubs are automatically detected.

To scan Bitcoin Cash xpubs, use the `--currency bch` argument:

`$ xpub-scan --currency bch <xpub> …`

## Usage 1. Check Balances

_In the following instructions, the generic `xpub` term is used to designate a master public key. It can be substituted with another type of supported public key, such as `Ltub` (Litecoin)._

### Scan for a Specific Account and an Index

`$ xpub-scan <xpub> --account <account> --index <index>`

Example:
`$ xpub-scan xpub6C...44dXs7p -a 0 -i 10` [addresses at account `0`, index `10`]

### ScanLimits Scan | Scan Addresses Derived From Index A to Index B

`$ xpub-scan <xpub> --account <account> --from-index <index A> [--to-index <index B>]`

Example 1:
`$ xpub-scan xpub6C...44dXs7p -a 0 --from-index 0 --to-index 100` [addresses at account `0`, from index `0` to index `100`, included]

Example 2:
`$ xpub-scan xpub6C...44dXs7p -a 1 --from-index 29` [addresses at account `0`, from index `29` until no active address]

Note: in order to perform the analysis in this context, Xpub Scan needs to pre-derive addresses. By default, it derives 2,000 addresses per account number. If needed, this number of addresses can be adjusted using the `--pre-derivation-size` option (useful with xpub associated with a large number of addresses).

### Full Scan | Scan All Active Addresses

`$ xpub-scan <xpub>`

Example:
`$ xpub-scan xpub6C...44dXs7p`

### Compare Imported Data With Actual Data

**Balance `--balance <balance>`**

`$ xpub-scan <xpub> --balance <balance (in base unit such as satoshis)>`

**Addresses `--addresses <filepath>`**

_(Not implemented yet)_

`$ xpub-scan <xpub> --addresses <file path>`

**UTXOs `--utxos <filepath>`**

_(Not implemented yet)_

`$ xpub-scan <xpub> --utxos <file path>`

**Operations `--operations <filepath>`**

`$ xpub-scan <xpub> --operations <file path>`

Example:
`$ xpub-scan xpub6C...44dXs7p --operations /Users/Test/Downloads/export.csv`

**General Example**

`$ xpub-scan xpub6C...44dXs7p --operations /Users/Test/Downloads/export.csv --balance 12345 --diff` displays at the end of the analysis the results of the comparison between the `12345` satoshis balance and the actual one, as well as the potential mismatches between the imported operations and the actual ones.

### Generate JSON and HTML Reports (Scan Only)

`$ xpub-scan <xpub> [args...] --save <directory>`

The files are saved as `<xpub>.json` and `<xpub>.html`.

Note: `--save stdout` can be used to display the JSON instead of saving the files. Furthermore, the `--quiet` option does not display the analysis progress while the `--silent` option does not display the progress _nor the results_.

### Comparisons-Related Option

- `--diff` displays the mismatches (if any) between the imported and actual operations.

## Usage 2. Check Address Against Xpub

_Check if an address has been derived from a master public key._

### Perfect Match

`$ xpub-scan <xpub> --address <address>`

### Partial Match

Add `?` where there is uncertainty about a character in the address. For instance: `1MYaYeZhDp?m3YtvqBMXQQN??YCz?7NqgF`

## Docker

Build: `$ docker build -t xpubscan .`

Run: `$ docker run xpubscan <xpub> [optional: <args>]`

## Interface

### Check Balance

When an analysis is performed, 3 elements are displayed in the following order:

- The analysis of each derived active address (type, path, address, current balance, total in `←`, total out `→`)
- The transactions ordered by date (date, block number, address, in `←` | out `→` | sent to self `⮂` | sent to sibling `↺` | received as change from non-sibling `c`)
- A summary: total number of transactions and total balance by address type

### Xpub and Address Comparison

The derived addresses are displayed during the analysis. Perfect matches are displayed in green (with the corresponding derivation path). Partial matches are displayed in blue (also with the derivation path). No matches are rendered in red.

## Configure

### Change Settings

1. Modify `./src/settings.ts`
2. rebuild the tool: `$ yarn build`
3. Re-run it: `$ node ./lib/scan.js <xpub> …`

### Change External Provider

**It is strongly encouraged to use the custom provider for reliable results.**

[Crypto APIs](https://cryptoapis.io/) can be used as a custom provider. In this context, a valid [v2 API key](https://dashboard.cryptoapis.io/account/api-keys) is required.

1. At the root of the project, rename `.env.template` to `.env`
2. In `.env`, set the `XPUB_SCAN_CUSTOM_API_KEY_V2` (corresponding to your Crypto APIs v2 API key—e.g.: `XPUB_SCAN_CUSTOM_API_KEY_V2=abcd6eacca264f7530eb2f7025a84f8`)
3. rebuild the tool: `$ yarn build`
4. Re-run it: `$ node ./lib/scan.js <xpub> …`
5. Ensure that, when running the tool, it shows that the _custom_ provider is being used
