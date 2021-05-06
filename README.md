# Xpub Scan

![XPUB](./doc/logo_alpha.png)

Given a master public key (xpub, Ltub, _etc._), get the balances of its derived legacy, native SegWit, and SegWit addresses, or check whether an address has been derived from it.

![Example](./doc/demo_balance.gif)

## Features

- Privacy Friendly: master public keys are never sent over the Internet: only their derived addresses are
- Derives specific addresses (by account+index) or all active ones
- Searches if a given address has been derived from a given master public key (perfect and partial match)
- Supports legacy, SegWit, and Native Segwit
- Automatically checks some categories of CSV files containing operations history

## Prerequisites

- Node.js and TypeScript,
- Docker

## Install

```
$ yarn
$ yarn build
```

### Currencies

By default, Bitcoin xpubs and Litecoin ltubs are automatically detected.

To scan Bitcoin Cash xpubs, use the `--currency bch` argument:

`$ node lib/scan.js --currency bch <xpub> …`

## Usage 1. Check Balances

_In the following instructions, the generic `xpub` term is used to designate a master public key. It can be substituted with another type of supported public key, such as `Ltub` (Litecoin)._

### Scan for a Specific Account and an Index

`$ node lib/scan.js <xpub> -a <account> -i <index>`

Example:
`$ node lib/scan.js xpub6C...44dXs7p -a 0 -i 10` [addresses at account `0`, index `10`]

### ScanLimits Scan | Scan Addresses Derived From Index A to Index B

`$ xpub-scan <xpub> -a <account> --from-index <index A> --to-index <index B>`

Example:
`$ xpub-scan xpub6C...44dXs7p -a 0 --from-index 0 --to-index 100` [addresses at account `0`, from index `0` to index `100`, included]

### Full Scan | Scan All Active Addresses

`$ node lib/scan.js <xpub>`

Example:
`$ node lib/scan.js xpub6C...44dXs7p`

### Compare Imported Data With Actual Data

**Balance `--balance <balance>`**

`$ node lib/scan.js <xpub> --balance <balance (in satoshis or similar base unit)>`

**Addresses `--addresses <filepath>`**

_(Not implemented yet)_

`$ node lib/scan.js <xpub> --addresses <file path>`

**UTXOs `--utxos <filepath>`**

_(Not implemented yet)_

`$ node lib/scan.js <xpub> --utxos <file path>`

**Operations `--operations <filepath>`**

`$ node lib/scan.js <xpub> --operations <file path>`

Example:
`$ node lib/scan.js xpub6C...44dXs7p --operations /Users/Test/Downloads/export.csv`

**General Example**

`$ node lib/scan.js xpub6C...44dXs7p --operations /Users/Test/Downloads/export.csv --balance 12345 --diff` displays at the end of the analysis the results of the comparison between the `12345` satoshis balance and the actual one, as well as the potential mismatches between the imported operations and the actual ones.

### Generate JSON and HTML Reports (Scan Only)

`$ node lib/scan.js <xpub> [args...] --save <directory>`

The files are saved as `<xpub>.json` and `<xpub>.html`.

Note: `--save stdout` can be used to display the JSON instead of saving the files. Furthermore, the `--quiet` option does not display the analysis progress while the `--silent` option does not display the progress _nor the results_.

### Comparisons-Related Option

- `--diff` displays the mismatches (if any) between the imported and actual operations.

## Usage 2. Check Address Against Xpub

_Check if an address has been derived from a master public key._

### Perfect Match

`$ node lib/scan.js <xpub> --address <address>`

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
3. Re-run it: `$ node lib/scan.js <xpub> …`

### Change External Provider

1. At the root of the project, rename `.env.template` to `.env`
2. In `.env`, set the `API_URL` as well as your `API_KEY` (following the structure provided by the `.env.template`)
3. rebuild the tool: `$ yarn build`
4. Re-run it: `$ node lib/scan.js <xpub> …`
5. Ensure that, when running the tool, it shows that the _custom_ provider is being used
