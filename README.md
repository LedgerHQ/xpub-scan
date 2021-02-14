# Xpub Scan

![XPUB](./doc/logo.png)

Given a master public key (xpub, Ltub, *etc.*), get the balances of its derived legacy, native SegWit, and SegWit addresses, or check whether an address has been derived from it.

![Example](./doc/demo_balance.gif)

## Features

* Privacy Friendly: master public keys are never sent over the Internet: only their derived addresses are 
* Derives specific addresses (by account+index) or all active ones
* Search if a given address has been derived from a given master public key
* Supports legacy, SegWit, and Native Segwit

## Prerequisites

- Node.js, and/or
- Docker

## Install

`$ npm i`

## Usage 1. Check Balances

*In the following instructions, the generic `xpub` term is used to designate a master public key. It can be substituted with another type of supported public key, such as `Ltub` (Litecoin).*

### Scan for a Specific Account and an Index

`$ node scan.js <xpub> <account> <index>`

Example: 
`$ node scan.js xpub6C...44dXs7p 0 10` [addresses at account `0`, index `10`]

### Scan All Active Addresses

`$ node scan.js <xpub>`

Example: 
`$ node scan.js xpub6C...44dXs7p`

## Usage 2. Check Address Against Xpub

*Check if an address has been derived from a master public key.*

### Perfect Match

`$ node scan.js <xpub> <address>`

### Partial Match

Add `?` where there is uncertainty about a character in the address. For instance: `1MYaYeZhDp?m3YtvqBMXQQN??YCz?7NqgF`

## Docker

Build: `$ docker build -t xpubscan .`

Run: `$ docker run xpubscan <xpub> [optional: <args>]`

## Interface

### Check Balance
When an analysis is performed, 3 elements are displayed in the following order:
* The analysis of each derived active address (type, path, address, current balance, total in `←`, total out `→`)
* The transactions ordered by date (date, block number, address, in `←` | out `→` | sent to self `↺`)
* A summary: total number of transactions and total balance by address type

### Xpub and Address Comparison
The derived addresses are displayed during the analysis. Perfect matches are displayed in green (with the corresponding derivation path). Partial matches are displayed in blue (also with the derivation path). No matches are rendered in red.
