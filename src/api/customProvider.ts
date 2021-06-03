import dateFormat from "dateformat";

import * as helpers from "../helpers";
import { configuration } from "../configuration/settings";
import { Address } from "../models/address";
import { Transaction } from "../models/transaction";
import { Operation } from "../models/operation";
import { TODO_TypeThis } from "../types";

import bchaddr from "bchaddrjs";
import { currencies } from "../configuration/currencies";

interface RawTransaction {
  transactionId: string;
  minedInBlockHeight: number;
  timestamp: number;
  fees: {
    amount: number;
    unit: string;
  };
  blockchainSpecific: {
    vin: {
      addresses: string[];
      value: string;
    }[];
    vout: {
      scriptPubKey: {
        addresses: string[];
      };
      value: string;
    }[];
  };
}

// returns the basic stats related to an address:
// its balance, funded and spend sums and counts
async function getStats(address: Address) {
  // important: coin name is required to be lower case for custom provider
  const coin = configuration.currency.name.toLowerCase().replace(" ", "-");

  const url = configuration.externalProviderURL
    .replace("{coin}", coin)
    .replace("{address}", address.toString());

  const res = await helpers.getJSON<TODO_TypeThis>(url, configuration.APIKey);
  const item = res.data.item;

  const fundedSum = parseFloat(item.totalReceived.amount);
  const spentSum = parseFloat(item.totalSpent.amount);
  const balance = parseFloat(item.confirmedBalance.amount);
  const txCount = item.transactionsCount;

  address.setStats(txCount, fundedSum, spentSum);
  address.setBalance(balance);

  const maxItemsPerRequest = 50;

  if (txCount > 0) {
    const getTxsURLTemplate = configuration.externalProviderURL
      .replace("{coin}", coin)
      .replace("{address}", address.toString())
      .concat(
        "/transactions?limit="
          .concat(maxItemsPerRequest.toString())
          .concat("&offset={offset}"),
      );

    // to handle large number of transactions by address, use the index+limit logic
    // offered by the custom provider
    const payloads = [];
    let offset = 0;
    for (; ; /* continue until no more item */ offset += maxItemsPerRequest) {
      const getTxsURL = getTxsURLTemplate.replace("{offset}", String(offset));

      const txs = await helpers.getJSON<TODO_TypeThis>(
        getTxsURL,
        configuration.APIKey,
      );

      const payload = txs.data.items;

      payloads.push(payload);

      // when the limit includes the total number of transactions,
      // no need to go further
      if (payload.length === 0) {
        break;
      }
    }

    // flatten the payloads
    // eslint-disable-next-line prefer-spread
    const rawTransactions = [].concat.apply([], payloads);

    address.setRawTransactions(JSON.stringify(rawTransactions));
  }
}

// transforms raw transactions associated with an address
// into an array of processed transactions:
// [ { blockHeight, txid, ins: [ { address, value }... ], outs: [ { address, value }...] } ]
function getTransactions(address: Address) {
  const rawTransactions = JSON.parse(address.getRawTransactions());
  const transactions: Transaction[] = [];

  rawTransactions.forEach((tx: RawTransaction) => {
    const ins: Operation[] = [];
    const outs: Operation[] = [];
    let amount = 0.0;
    let processIn = false;
    let processOut = false;

    // 1. Detect operation type
    for (const txin of tx.blockchainSpecific.vin) {
      for (let inAddress of txin.addresses) {
        // provider Bitcoin Cash addresses are expressed as cash addresses:
        // they have to be converted into legacy ones
        if (configuration.currency.symbol === currencies.bch.symbol) {
          inAddress = bchaddr.toLegacyAddress(inAddress);
        }

        if (inAddress.includes(address.toString())) {
          processOut = true;
          break;
        }
      }
    }

    for (const txout of tx.blockchainSpecific.vout) {
      for (let outAddress of txout.scriptPubKey.addresses) {
        // provider Bitcoin Cash addresses are expressed as cash addresses:
        // they have to be converted into legacy ones
        if (configuration.currency.symbol === currencies.bch.symbol) {
          outAddress = bchaddr.toLegacyAddress(outAddress);
        }

        if (outAddress.includes(address.toString()!)) {
          // when IN op, amount corresponds to txout
          amount += parseFloat(txout.value);
          processIn = true;
        }
      }
    }

    // 2. Process operations
    if (processIn) {
      tx.blockchainSpecific.vin.forEach((txin) => {
        txin.addresses.forEach((inAddress) => {
          const op = new Operation(String(tx.timestamp), amount);

          if (configuration.currency.symbol === currencies.bch.symbol) {
            // provider Bitcoin Cash addresses are expressed as cash addresses:
            // they have to be converted into legacy ones
            inAddress = bchaddr.toLegacyAddress(inAddress);
          }

          op.setAddress(inAddress);
          op.setTxid(tx.transactionId);
          op.setOperationType("Received");

          ins.push(op);
        });
      });
    }

    if (processOut) {
      tx.blockchainSpecific.vout.forEach((txout) => {
        txout.scriptPubKey.addresses.forEach((outAddress) => {
          const op = new Operation(
            String(tx.timestamp),
            parseFloat(txout.value),
          );

          if (configuration.currency.symbol === currencies.bch.symbol) {
            // provider Bitcoin Cash addresses are expressed as cash addresses:
            // they have to be converted into legacy ones
            outAddress = bchaddr.toLegacyAddress(outAddress);
          }

          op.setAddress(outAddress);
          op.setTxid(tx.transactionId);
          op.setOperationType("Sent");

          outs.push(op);
        });
      });
    }

    transactions.push(
      new Transaction(
        tx.minedInBlockHeight,
        String(
          dateFormat(new Date(tx.timestamp * 1000), "yyyy-mm-dd HH:MM:ss"),
        ), // unix time to readable format
        tx.transactionId,
        ins,
        outs,
      ),
    );
  });

  address.setTransactions(transactions);
}

export { getStats, getTransactions };
