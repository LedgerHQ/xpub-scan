import { VERBOSE, configuration } from "../configuration/settings";
import { Address } from "../models/address";
import { OwnAddresses } from "../models/ownAddresses";
import { Operation } from "../models/operation";

import * as defaultProvider from "../api/defaultProvider";
import * as customProvider from "../api/customProvider";
import { TODO_TypeThis } from "../types";
import { currencies } from "../configuration/currencies";

/**
 * fetch the processed basic stats related to an address
 * its balance, funded and spend sums and counts
 * @param address the address being analyzed
 * @param balanceOnly an option to return only the balance (only for Crypto APIs)
 */
async function getStats(address: Address, balanceOnly: boolean) {
  switch (configuration.providerType) {
    case "default":
      await defaultProvider.getStats(address);
      break;

    case "Crypto APIs":
      await customProvider.getStats(address, balanceOnly);
      break;

    default:
      throw new Error(
        "Should not be reachable: providerType should be 'default' or 'Crypto APIs'",
      );
  }
}

/**
 * get all processed transactions related to an address
 * @param address the address being analyzed
 * @param ownAddresses (optional) list of addresses derived from the same xpub as `address`
 */
function getTransactions(address: Address, ownAddresses?: OwnAddresses) {
  if (configuration.currency.symbol === currencies.eth.symbol) {
    switch (configuration.providerType) {
      case "default":
        defaultProvider.getAccountBasedTransactions(address);
        break;

      case "Crypto APIs":
        customProvider.getAccountBasedTransactions(address);
        break;

      default:
        throw new Error(
          "Should not be reachable: providerType should be 'default' or 'Crypto APIs'",
        );
    }

    return;
  }

  preprocessTransactions(address);
  processFundedTransactions(address, ownAddresses!);
  processSentTransactions(address, ownAddresses!);
}

// get and transform raw transactions associated with an address
// into an array of processed transactions
function preprocessTransactions(address: Address) {
  switch (configuration.providerType) {
    case "default":
      defaultProvider.getTransactions(address);
      break;

    case "Crypto APIs":
      customProvider.getTransactions(address);
      break;

    default:
      throw new Error(
        "Should not be reachable: providerType should be 'default' or 'Crypto APIs'",
      );
  }
}

// process amounts received
function processFundedTransactions(
  address: Address,
  ownAddresses: OwnAddresses,
) {
  const transactions = address.getTransactions();
  const allOwnAddresses = ownAddresses.getAllAddresses();
  const accountNumber = address.getDerivation().account;
  let isFunded: boolean;

  for (const tx of transactions) {
    isFunded = true;
    if (typeof tx.ins !== "undefined" && tx.ins.length > 0) {
      // if account is internal (i.e., 1), and
      //     - has a sibling as sender: not externally funded (expected behavior: sent to change)
      //     - has no sibling as sender: process the operation (edge case: non-sibling to change)
      if (accountNumber === 1) {
        for (const txin of tx.ins) {
          if (allOwnAddresses.includes(txin.address)) {
            isFunded = false;
            break;
          }
        }
      }

      if (isFunded) {
        const op = new Operation(tx.date, tx.ins[0].amount);
        op.setTxid(tx.txid);
        op.setBlockNumber(tx.blockHeight);

        // there are 2 types of received transaction:
        // case 1 — received to an address that is NOT a change address: default received
        // case 2 — received to a change address (account #1): received from non-sibling to change
        op.setOperationType(
          accountNumber !== 1 ? "Received" : "Received (non-sibling to change)",
        );

        address.addFundedOperation(op);
      }
    }
  }

  if (VERBOSE) {
    console.log("FUNDED\t", address.getFundedOperations());
  }
}

// process amounts sent to relevant addresses
function processSentTransactions(address: Address, ownAddresses: OwnAddresses) {
  const transactions = address.getTransactions();
  const internalAddresses = ownAddresses.getInternalAddresses();
  const externalAddresses = ownAddresses.getExternalAddresses();

  for (const tx of transactions) {
    const outs = tx.outs;

    outs.forEach((out) => {
      const isInternalAddress = internalAddresses.includes(out.address);
      const isExternalAddress = externalAddresses.includes(out.address);

      // exclude internal (i.e. change) addresses
      if (!isInternalAddress) {
        const op = new Operation(tx.date, out.amount);
        op.setTxid(tx.txid);

        // there are 3 types of sent transactions:
        if (out.address === address.toString()) {
          // case 1 — sent to self: sent to same address
          op.setOperationType("Sent to self");
        } else if (isExternalAddress) {
          // case 2 — sent to a sibling: sent to an address belonging to the same xpub
          // _while not being a change address_
          op.setOperationType("Sent to sibling");
        } else {
          // case 3 — sent to an address not belonging to the xpub
          op.setOperationType("Sent");
        }

        op.setBlockNumber(tx.blockHeight);

        address.addSentOperation(op);
      }
    });
  }

  if (VERBOSE) {
    console.log("SENT\t", address.getSpentOperations());
  }
}

// sort by block number and, _then, if needed_, by date
function compareOpsByBlockThenDate(A: Operation, B: Operation) {
  // block number
  if (A.block > B.block) {
    return -1;
  }

  if (A.block < B.block) {
    return 1;
  }

  // date
  if (A.date > B.date) {
    return -1;
  }

  if (A.date < B.date) {
    return 1;
  }

  return 0;
}

/**
 * Returns an array of ordered operations
 * @param {...any} addresses - all active addresses belonging to the xpub
 * @returns {Array<Address>} Array of operations in reverse chronological order
 */
function getSortedOperations(...addresses: TODO_TypeThis): Operation[] {
  const operations: Operation[] = [];
  const processedTxids: string[] = [];

  // flatten the array of arrays in one dimension, and iterate
  [].concat(...addresses).forEach((address: Address) => {
    address.getFundedOperations().forEach((op: Operation) => {
      op.setAddress(address.toString());

      if (configuration.currency.symbol === currencies.bch.symbol) {
        op.setCashAddress(address.asCashAddress());
      }

      operations.push(op);
    });

    address.getSpentOperations().forEach((op: Operation) => {
      // only process a given txid once
      if (!processedTxids.includes(op.txid)) {
        op.setAddress(address.toString());

        if (configuration.currency.symbol === currencies.bch.symbol) {
          op.setCashAddress(address.asCashAddress());
        }

        operations.push(op);
        processedTxids.push(op.txid);
      }
    });
  });

  // reverse chronological order
  operations.sort(compareOpsByBlockThenDate);

  return operations;
}

/**
 * Returns an array of ordered UTXOs
 * @param {...any} addresses - all active addresses belonging to the xpub
 * @returns {Array<Address>} Array of UTXOs in reverse chronological order
 */
// (reverse chronological order)
function getSortedUTXOS(...addresses: TODO_TypeThis): Address[] {
  // note: no need to explicitely sort the UTXOs as they inherit
  //       the order from the addresses themselves

  const utxos: Address[] = [];

  // flatten the array of arrays in one dimension, and iterate
  [].concat(...addresses).forEach((address: Address) => {
    if (address.isUTXO()) {
      utxos.push(address);
    }
  });

  return utxos;
}

export { getStats, getTransactions, getSortedOperations, getSortedUTXOS };
