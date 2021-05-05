import dateFormat from "dateformat";

import { getJSON } from "../helpers";
import { configuration } from "../configuration/settings";
import { Address } from "../models/address";
import { Transaction } from "../models/transaction";
import { Operation } from "../models/operation";
import { TODO_TypeThis } from "../types";

// raw transactions provided by default API
interface RawTransaction {
  txid: string;
  block_no: number;
  confirmations: number;
  time: number;
  incoming: {
    value: string;
    inputs: {
      address: string;
    }[];
  };
  outgoing: {
    value: string;
    outputs: {
      address: string;
      value: string;
    }[];
  };
}

// raw transactions provided by BCH API
interface BchRawTransaction {
  txid: string;
  blockheight: number;
  confirmations: number;
  time: number;
  vin: {
    value: string;
    addr: string;
  }[];
  vout: {
    value: string;
    scriptPubKey: {
      addresses: string[];
    };
  }[];
}

// returns the basic stats related to an address:
// its balance, funded and spend sums and counts
async function getStats(address: Address, coin: string) {
  if (coin === "BCH") {
    return getBchStats(address);
  }

  const url = configuration.defaultAPI.general
    .replace("{coin}", coin)
    .replace("{address}", address.toString());

  const res = await getJSON<TODO_TypeThis>(url);

  // TODO: check potential errors here (API returning invalid data...)
  const fundedSum = parseFloat(res.data.received_value);
  const balance = parseFloat(res.data.balance);
  const spentSum = fundedSum - balance;

  address.setStats(res.data.total_txs, fundedSum, spentSum);
  address.setBalance(balance);

  address.setRawTransactions(JSON.stringify(res.data.txs));
}

async function getBchStats(address: Address) {
  const urlStats = configuration.defaultAPI.bch
    .replace("{type}", "details")
    .replace("{address}", address.asCashAddress()!);

  const res = await getJSON<TODO_TypeThis>(urlStats);

  // TODO: check potential errors here (API returning invalid data...)
  const fundedSum = parseFloat(res.totalReceived);
  const balance = parseFloat(res.balance);
  const spentSum = parseFloat(res.totalSent);

  address.setStats(res.txApperances, fundedSum, spentSum);
  address.setBalance(balance);

  const urlTxs = configuration.defaultAPI.bch
    .replace("{type}", "transactions")
    .replace("{address}", address.asCashAddress()!);

  const payloads = [];
  let totalPages = 1;

  for (let i = 0; i < totalPages; i++) {
    const response = await getJSON<TODO_TypeThis>(
      urlTxs.concat("?page=").concat(i.toString()),
    );
    totalPages = response.pagesTotal;
    payloads.push(response.txs);
  }

  // flatten the payloads
  // eslint-disable-next-line prefer-spread
  const rawTransactions = [].concat.apply([], payloads);

  address.setRawTransactions(JSON.stringify(rawTransactions));
}

// transforms raw transactions associated with an address
// into an array of processed transactions:
// [ { blockHeight, txid, ins: [ { address, value }... ], outs: [ { address, value }...] } ]
function getTransactions(address: Address) {
  // Because the general default API is not compatible with Bitcoin Cash,
  // these transactions have to be specifically handled
  if (configuration.symbol === "BCH") {
    return getBchTransactions(address);
  }

  // 1. get raw transactions
  const rawTransactions = JSON.parse(address.getRawTransactions());

  // 2. parse raw transactions
  const transactions: Transaction[] = [];

  rawTransactions.forEach((tx: RawTransaction) => {
    const ins: Operation[] = [];
    const outs: Operation[] = [];

    if (typeof tx.incoming !== "undefined") {
      tx.incoming.inputs.forEach((txin) => {
        const op = new Operation(
          String(tx.time),
          parseFloat(tx.incoming.value),
        );
        op.setAddress(txin.address);
        op.setTxid(tx.txid);
        op.setType("Received");

        ins.push(op);
      });
    }

    if (typeof tx.outgoing !== "undefined") {
      tx.outgoing.outputs.forEach((txout) => {
        const op = new Operation(String(tx.time), parseFloat(txout.value));
        op.setAddress(txout.address);
        op.setTxid(tx.txid);
        op.setType("Sent");

        outs.push(op);
      });
    }

    transactions.push(
      new Transaction(
        tx.block_no,
        String(dateFormat(new Date(tx.time * 1000), "yyyy-mm-dd HH:MM:ss")), // unix time to readable format
        tx.txid,
        ins,
        outs,
      ),
    );
  });

  address.setTransactions(transactions);
}

// transforms raw Bitcoin Cash transactions associated with an address
// into an array of processed transactions:
// [ { blockHeight, txid, ins: [ { address, value }... ], outs: [ { address, value }...] } ]
function getBchTransactions(address: Address) {
  // 1. get raw transactions
  const rawTransactions = JSON.parse(address.getRawTransactions());

  // 2. parse raw transactions
  const transactions: Transaction[] = [];

  rawTransactions.forEach((tx: BchRawTransaction) => {
    const ins: Operation[] = [];
    const outs: Operation[] = [];
    let amount = 0.0;
    let processIn = false;
    let processOut = false;

    // 1. Detect operation type
    for (const txin of tx.vin) {
      if (txin.addr.includes(address.toString())) {
        processOut = true;
        break;
      }
    }

    for (const txout of tx.vout) {
      if (typeof txout.scriptPubKey.addresses === "undefined") {
        continue;
      }
      for (const outAddress of txout.scriptPubKey.addresses) {
        if (outAddress.includes(address.toString())) {
          // when IN op, amount corresponds to txout
          amount = parseFloat(txout.value);
          processIn = true;
          break;
        }
      }
    }

    if (processIn) {
      tx.vin.forEach((txin) => {
        const op = new Operation(String(tx.time), amount);
        op.setAddress(txin.addr);
        op.setTxid(tx.txid);
        op.setType("Received");

        ins.push(op);
      });
    }

    if (processOut) {
      tx.vout.forEach((txout) => {
        if (parseFloat(txout.value) === 0) {
          return;
        }
        const op = new Operation(String(tx.time), parseFloat(txout.value));
        op.setAddress(txout.scriptPubKey.addresses[0]);
        op.setTxid(tx.txid);
        op.setType("Sent");

        outs.push(op);
      });
    }

    transactions.push(
      new Transaction(
        tx.blockheight,
        String(dateFormat(new Date(tx.time * 1000), "yyyy-mm-dd HH:MM:ss")), // unix time to readable format
        tx.txid,
        ins,
        outs,
      ),
    );
  });

  address.setTransactions(transactions);
}

export { getStats, getTransactions, getBchTransactions };
