// custom provider:
// Crypto APIs 2.0 <https://cryptoapis.io/>
// https://developers.cryptoapis.io/technical-documentation/general-information/overview

import * as helpers from "../helpers";
import { currencies } from "../configuration/currencies";
import { configuration, ETH_FIXED_PRECISION } from "../configuration/settings";
import { Address } from "../models/address";
import { Transaction } from "../models/transaction";
import { Operation } from "../models/operation";

import { format } from "date-fns";
import bchaddr from "bchaddrjs";
import BigNumber from "bignumber.js";
import hash from "object-hash";

type Transactors = Array<{
  address: string;
  amount: string;
}>;

interface RawTransaction {
  // COMMON
  transactionId: string;
  minedInBlockHeight: number;
  timestamp: number;
  fee: {
    amount: number;
    unit: string;
  };
  recipients: Transactors;
  senders: Transactors;
  blockchainSpecific: {
    vin: {
      addresses: string[];
      value: string;
      vout: number;
    }[];
    vout: {
      isSpent: boolean;
      value: string;
    }[];
    transactionStatus: string;
  };

  // TOKENS
  transactionHash: string;
  recipientAddress: string;
  senderAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokensAmount: number;
  transactionTimestamp: number;

  // INTERNAL TRANSACTIONS
  parentHash: string;
  recipient: string;
  sender: string;
  operationID: string;
  operationType: string;
  amount: string;
}

// returns the transactional payloads
async function getPayloads(
  coin: string,
  address: string,
  transactionType: string,
) {
  const maxItemsPerRequest = 50;
  const payloads = [];

  const getTxsURLTemplate = configuration.externalProviderURL
    .concat("/addresses/")
    .concat(address.toString())
    .replace("{coin}", coin)
    .concat(
      transactionType
        .concat("?limit=")
        .concat(maxItemsPerRequest.toString())
        .concat("&offset={offset}"),
    );

  // to handle large number of transactions by address, use the index+limit logic
  // offered by the custom provider
  let offset = 0;
  let itemsRemainingToBeFetched = true;

  while (itemsRemainingToBeFetched) {
    const url = getTxsURLTemplate.replace("{offset}", String(offset));

    const txs = await helpers.getJSON<any>(url, configuration.APIKey);

    const payload = txs.data.items;

    // when the limit includes the total number of transactions,
    // no need to go further
    if (payload.length === 0) {
      itemsRemainingToBeFetched = false;
      break;
    }

    payloads.push(payload);

    offset += maxItemsPerRequest;
  }

  return payloads;
}

// returns the transactional payload
async function getTransactionPayload(coin: string, transactionHash: string) {
  const url = configuration.externalProviderURL
    .replace("{coin}", coin)
    .concat("/transactions/")
    .concat(transactionHash);

  const txs = await helpers.getJSON<any>(url, configuration.APIKey);

  return txs.data.item;
}

// returns the basic operations payloads
async function getOperationsPayloads(coin: string, address: Address) {
  return getPayloads(coin, address.toString(), "/transactions");
}

// returns the Ethereum tokens-related payloads
async function getTokenPayloads(coin: string, address: Address) {
  const rawTokenOperations = await getPayloads(
    coin,
    address.toString(),
    "/tokens-transfers",
  );
  const tokenOperations = [].concat(...rawTokenOperations);

  // augment token operations with transaction data
  for (const tokenOperation of tokenOperations as Array<RawTransaction>) {
    const transaction = await getTransactionPayload(
      coin,
      tokenOperation.transactionHash,
    );

    // add data related to recipients and senders
    tokenOperation.recipients = transaction.recipients;
    tokenOperation.senders = transaction.senders;

    tokenOperation.fee = transaction.fee;
  }

  return tokenOperations;
}

// returns the Ethereum internal transactions
async function getInternalTransactionsPayloads(coin: string, address: Address) {
  return getPayloads(coin, address.toString(), "/internal");
}

// returns the basic stats related to an address:
// its balance, funded and spend sums and counts
async function getStats(address: Address, balanceOnly: boolean) {
  // important: coin name is required to be lower case for custom provider
  const coin = configuration.currency.name.toLowerCase().replace(" ", "-");

  const url = configuration.externalProviderURL
    .concat("/addresses/")
    .concat(address.toString())
    .replace("{coin}", coin);

  const res = await helpers.getJSON<any>(url, configuration.APIKey);
  const item = res.data.item;

  const fundedSum = item.totalReceived.amount;
  const spentSum = item.totalSpent.amount;
  const balance = item.confirmedBalance.amount;
  const txCount = item.transactionsCount;

  address.setStats(txCount, fundedSum, spentSum);
  address.setBalance(balance);

  // get transactions (when applicable)
  if (!balanceOnly) {
    let payloads = await getOperationsPayloads(coin, address);

    // Ethereum: add token-related and internal transactions
    if (configuration.currency.symbol === currencies.eth.symbol) {
      payloads = payloads.concat(await getTokenPayloads(coin, address));
      payloads = payloads.concat(
        payloads,
        await getInternalTransactionsPayloads(coin, address),
      );
    }

    // flatten the payloads
    const rawTransactions = [].concat(...payloads);

    // Remove duplicates
    // (related to a bug from the custom provider)
    const uniqueRawTransactions: any[] = [];

    for (let i = rawTransactions.length - 1; i >= 0; i--) {
      const transaction = rawTransactions[i];
      const h = hash(transaction);
      if (!uniqueRawTransactions.includes(h)) {
        uniqueRawTransactions.push(h);
      } else {
        // remove duplicate
        rawTransactions.splice(i, 1);
      }
    }

    address.setRawTransactions(rawTransactions);
  }
}

// transforms raw transactions associated with an address
// into an array of processed transactions:
// [ { blockHeight, txid, ins: [ { address, value }... ], outs: [ { address, value }...] } ]
function getTransactions(address: Address) {
  const rawTransactions = address.getRawTransactions();
  const transactions: Transaction[] = [];

  // Bitcoin Cash addresses are expressed as cash addresses by the custom provider:
  // they have to be converted into legacy ones (if needed)
  const processAddress = (originalAddress: string) => {
    if (configuration.currency.symbol === currencies.bch.symbol) {
      return bchaddr.toLegacyAddress(originalAddress);
    } else {
      return originalAddress;
    }
  };

  rawTransactions.forEach((tx: RawTransaction) => {
    const ins: Operation[] = [];
    const outs: Operation[] = [];

    // identify whether the address belongs to the list of transactors or not
    const addressBelongsToTransactors = (Transactors: Transactors) => {
      for (const transactor of Transactors) {
        if (processAddress(transactor.address).includes(address.toString()!)) {
          return true;
        }
      }

      return false;
    };

    // the address currently being analyzed is a — recipient —
    if (addressBelongsToTransactors(tx.recipients)) {
      for (const recipient of tx.recipients) {
        if (processAddress(recipient.address).includes(address.toString()!)) {
          // add one operation per sender
          for (const sender of tx.senders) {
            const op = new Operation(
              String(tx.timestamp),
              new BigNumber(recipient.amount),
            );

            op.setAddress(processAddress(sender.address));

            op.setTxid(tx.transactionId);
            op.setOperationType("Received");

            ins.push(op);
          }
        }
      }
    }

    // the address currently being analyzed is a — sender —
    if (addressBelongsToTransactors(tx.senders)) {
      let amountSent = new BigNumber(0);

      for (let i = 0; i < tx.recipients.length; i++) {
        const recipient = tx.recipients[i];

        // note: the amount sent is specified in blockchainSpecific.vout
        // _at the same index as the recipient_
        amountSent = amountSent.plus(tx.blockchainSpecific.vout[i].value);

        const op = new Operation(String(tx.timestamp), amountSent);

        op.setAddress(processAddress(recipient.address));
        op.setTxid(tx.transactionId);
        op.setOperationType("Sent");

        outs.push(op);
      }
    }

    transactions.push(
      new Transaction(
        tx.minedInBlockHeight,
        format(new Date(tx.timestamp * 1000), "yyyy-MM-dd HH:mm:ss"),
        tx.transactionId,
        ins,
        outs,
      ),
    );
  });

  address.setTransactions(transactions);
}

function getAccountBasedTransactions(address: Address) {
  const rawTransactions = address.getRawTransactions();

  rawTransactions.forEach((tx: RawTransaction) => {
    // skip non-basic operations
    if (typeof tx.blockchainSpecific === "undefined") {
      return;
    }

    const isSender = tx.senders.some(
      (t) => t.address.toLowerCase() === address.toString().toLowerCase(),
    );

    const isRecipient = tx.recipients.some(
      (t) => t.address.toLowerCase() === address.toString().toLowerCase(),
    );

    const isFailedOperation = tx.blockchainSpecific.transactionStatus !== "0x1";

    // ignore failed *incoming* transactions
    if (isFailedOperation && isRecipient) {
      return;
    }

    const timestamp = format(
      new Date(tx.timestamp * 1000),
      "yyyy-MM-dd HH:mm:ss",
    );

    // RECIPIENT
    if (isRecipient) {
      const amount = tx.recipients.reduce((a, b) => +a + +b.amount, 0);
      const fixedAmount = amount.toFixed(ETH_FIXED_PRECISION);

      const op = new Operation(timestamp, new BigNumber(fixedAmount)); // ETH: use fixed-point notation
      op.setAddress(address.toString());
      op.setTxid(tx.transactionId);
      op.setOperationType("Received");
      op.setBlockNumber(tx.minedInBlockHeight);

      address.addFundedOperation(op);
    }

    // SENDER
    if (isSender) {
      const amount = new BigNumber(
        tx.recipients.reduce((a, b) => +a + +b.amount, 0),
      );
      const fixedAmount = amount.toFixed(ETH_FIXED_PRECISION);
      const op = new Operation(timestamp, new BigNumber(fixedAmount)); // ETH: use fixed-point notation
      op.setAddress(address.toString());
      op.setTxid(tx.transactionId);

      if (!isFailedOperation) {
        op.setOperationType(isRecipient ? "Sent to self" : "Sent");
      } else {
        // failed outgoing operation
        op.setOperationType("Failed to send");
      }

      op.setBlockNumber(tx.minedInBlockHeight);

      address.addSentOperation(op);
    }
  });

  getTokenTransactions(address);
  getInternalTransactions(address);
}

function getTokenTransactions(address: Address) {
  const rawTransactions = address.getRawTransactions();

  rawTransactions.forEach((tx: RawTransaction) => {
    // skip non-token operations
    if (typeof tx.senderAddress === "undefined") {
      return;
    }

    const isSender =
      tx.senderAddress.toLocaleLowerCase() ===
      address.toString().toLocaleLowerCase();

    const isRecipient =
      tx.recipientAddress.toLocaleLowerCase() ===
      address.toString().toLocaleLowerCase();

    const tokenAmount = new BigNumber(tx.tokensAmount);
    const tokenName = tx.tokenName;
    const tokenSymbol = tx.tokenSymbol;

    const timestamp = format(
      new Date(tx.transactionTimestamp * 1000),
      "yyyy-MM-dd HH:mm:ss",
    );
    // compute amount
    // (note: the dualities isSender/isRecipient and has sent/has received do not necessarily
    //        overlap (e.g., a recipient can also have sent in the swapping context)
    const fees = new BigNumber(tx.fee.amount);
    let amount = new BigNumber(0);
    let hasSent = false;

    // case 1. has received
    for (const recipient of tx.recipients) {
      if (
        recipient.address.toLocaleLowerCase() ===
        address.toString().toLocaleLowerCase()
      ) {
        amount = amount.plus(recipient.amount);
      }
    }

    // case 2. has sent
    for (const sender of tx.senders) {
      if (
        sender.address.toLocaleLowerCase() ===
        address.toString().toLocaleLowerCase()
      ) {
        amount = amount.minus(sender.amount);
        hasSent = true;
      }
    }

    if (hasSent) {
      amount = amount.plus(fees); // if has sent, add fees
    }

    if (isRecipient) {
      // Recipient
      const fixedAmount = amount.toFixed(ETH_FIXED_PRECISION);
      const op = new Operation(timestamp, new BigNumber(fixedAmount)); // ETH: use fixed-point notation
      op.setAddress(address.toString());
      op.setTxid(tx.transactionHash);

      // operation type: if is recipient but has sent: swap operation
      op.setOperationType(hasSent ? "Swapped" : "Received (token)");

      op.setBlockNumber(tx.minedInBlockHeight);

      op.addToken(tokenSymbol, tokenName, tokenAmount);

      address.addFundedOperation(op);
    }

    if (isSender) {
      const fixedAmount = amount.toFixed(ETH_FIXED_PRECISION);
      const op = new Operation(timestamp, new BigNumber(fixedAmount)); // ETH: use fixed-point notation
      op.setAddress(address.toString());
      op.setTxid(tx.transactionHash);

      op.setOperationType("Sent (token)");

      op.setBlockNumber(tx.minedInBlockHeight);

      op.addToken(tokenSymbol, tokenName, tokenAmount);

      address.addSentOperation(op);
    }
  });
}

function getInternalTransactions(address: Address) {
  const rawTransactions = address.getRawTransactions();

  rawTransactions.forEach((tx: RawTransaction) => {
    // skip non-internal transactions
    if (typeof tx.operationType === "undefined") {
      return;
    }

    const isSender =
      tx.sender.toLocaleLowerCase() === address.toString().toLocaleLowerCase();

    const isRecipient =
      tx.recipient.toLocaleLowerCase() ===
      address.toString().toLocaleLowerCase();

    const amount = new BigNumber(0);

    const timestamp = format(
      new Date(tx.timestamp * 1000),
      "yyyy-MM-dd HH:mm:ss",
    );

    if (isRecipient) {
      // Recipient
      const fixedAmount = amount.toFixed(ETH_FIXED_PRECISION);
      const op = new Operation(timestamp, new BigNumber(fixedAmount)); // ETH: use fixed-point notation
      op.setAddress(address.toString());
      op.setTxid(tx.parentHash);

      op.setOperationType("SCI (recipient)");

      op.setBlockNumber(tx.minedInBlockHeight);

      address.addFundedOperation(op);
    }

    if (isSender) {
      // Sender
      const fixedAmount = amount.toFixed(ETH_FIXED_PRECISION);
      const op = new Operation(timestamp, new BigNumber(fixedAmount)); // ETH: use fixed-point notation
      op.setAddress(address.toString());
      op.setTxid(tx.parentHash);

      op.setOperationType("SCI (caller)");

      op.setBlockNumber(tx.minedInBlockHeight);

      address.addSentOperation(op);
    }
  });
}

export { getStats, getTransactions, getAccountBasedTransactions };
