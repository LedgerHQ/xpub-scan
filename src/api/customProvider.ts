// Here, the raw data is fetched from Crypto APIs (i.e., Crypto APIs):
//  - balance,
//  - total spent and received, and
//  - operations
// per address
//
// Crypto APIs 2.0 <https://cryptoapis.io/>
// https://developers.cryptoapis.io/technical-documentation/general-information/overview
//
// In order to enable Crypto APIs, an API key has to be provided (see: README.md)

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

// structure of the responses from Crypto APIs
interface RawTransaction {
  // common
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
      addresses: Array<string>;
      value: string;
      vout: number;
    }[];
    vout: {
      isSpent: boolean;
      value: string;
    }[];
    transactionStatus: string;
  };

  // tokens
  transactionHash: string;
  recipientAddress: string;
  senderAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokensAmount: number;
  transactionTimestamp: number;

  // internal transactions
  parentHash: string;
  recipient: string;
  sender: string;
  operationID: string;
  operationType: string;
  amount: string;
}

// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ FETCH RAW DATA FROM CRYPTO APIS ┃
// ┃ just fetch the JSON responses   ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * fetch the response associated with the request (basic data, transactions)
 * @param currency the currency being analyzed
 * @param address the address being analyzed
 * @param endpoint the endpoint to call
 * @returns an array of transactions (if any)
 */
async function fetchPayloads(
  currency: string,
  address: string,
  endpoint: string,
) {
  // limit the number of transactions per request
  const maxItemsPerRequest = 50;

  const payloads = [];

  const getTxsURLTemplate = configuration.externalProviderURL
    .concat("/addresses/")
    .concat(address.toString())
    .replace("{currency}", currency)
    .concat(
      endpoint
        .concat("?limit=")
        .concat(maxItemsPerRequest.toString())
        .concat("&offset={offset}"),
    );

  // to handle large number of transactions by address, use the index+limit logic
  // offered by Crypto APIs
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

/**
 * fetch the transactions associated with a transaction hash
 * @param currency the currency being analyzed
 * @param transactionHash a transaction hash
 * @returns the transactions associated with a transaction hash
 */
async function fetchTransactionPayload(
  currency: string,
  transactionHash: string,
) {
  const url = configuration.externalProviderURL
    .replace("{currency}", currency)
    .concat("/transactions/")
    .concat(transactionHash);

  // important: a valid API key has to be provided
  const txs = await helpers.getJSON<any>(url, configuration.APIKey);

  return txs.data.item;
}

/**
 * fetch the raw basic stats (balance, transactions count...) associated with an address
 * @param currency the currency being analyzed
 * @param address the address being analyzed
 * @returns the basic data associated with an address
 */
async function fetchOperationsPayloads(currency: string, address: Address) {
  return fetchPayloads(currency, address.toString(), "/transactions");
}

/**
 * fetch the raw token-related transactions related to an address
 * @param currency the currency being analyzed (account-based; typically Ethereum)
 * @param address the address being analyzed (account-based; typically Ethereum)
 * @returns the token-related transactions related to an address
 */
async function fetchTokenPayloads(currency: string, address: Address) {
  const rawTokenOperations = await fetchPayloads(
    currency,
    address.toString(),
    "/tokens-transfers",
  );
  const tokenOperations = [].concat(...rawTokenOperations);

  // augment token operations with transaction data
  for (const tokenOperation of tokenOperations as Array<RawTransaction>) {
    const transaction = await fetchTransactionPayload(
      currency,
      tokenOperation.transactionHash,
    );

    // add data related to recipients and senders
    tokenOperation.recipients = transaction.recipients;
    tokenOperation.senders = transaction.senders;

    tokenOperation.fee = transaction.fee;
  }

  return tokenOperations;
}

/**
 * fetch the raw internal transactions related to an address
 * @param currency the currency being analyzed (account-based; typically Ethereum)
 * @param address the address being analyzed (account-based; typically Ethereum)
 * @returns the internal transactions related to an address
 */
async function fetchInternalTransactionsPayloads(
  currency: string,
  address: Address,
) {
  return fetchPayloads(currency, address.toString(), "/internal");
}

// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ NORMALIZE TRANSACTIONS FROM CRYPTO APIS           ┃
// ┃ transform JSONs into stats and Operations objects ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * fetch the structured basic stats related to an address
 * its balance, funded and spend sums and counts
 * @param address the address being analyzed
 * @param balanceOnly an option to return only the balance
 */
async function getStats(address: Address, balanceOnly: boolean) {
  // important: currency name is required to be lower case for Crypto APIs
  const currency = configuration.currency.name.toLowerCase().replace(" ", "-");

  const url = configuration.externalProviderURL
    .concat("/addresses/")
    .concat(address.toString())
    .replace("{currency}", currency);

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
    let payloads = await fetchOperationsPayloads(currency, address);

    // Ethereum: add token-related and internal transactions
    if (configuration.currency.symbol === currencies.eth.symbol) {
      payloads = payloads.concat(await fetchTokenPayloads(currency, address));
      payloads = payloads.concat(
        payloads,
        await fetchInternalTransactionsPayloads(currency, address),
      );
    }

    // flatten the payloads
    const rawTransactions = [].concat(...payloads);

    // Remove duplicates
    // (related to a bug from Crypto APIs)
    const uniqueRawTransactions: Array<any> = [];

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

/**
 * get all structured transactions related to an address
 * @param address the address being analyzed
 */
function getTransactions(address: Address) {
  const rawTransactions = address.getRawTransactions();
  const transactions: Array<Transaction> = [];

  // Bitcoin Cash addresses are expressed as cash addresses by Crypto APIs:
  // they have to be converted into legacy ones (if needed)
  const processAddress = (originalAddress: string) => {
    if (configuration.currency.symbol === currencies.bch.symbol) {
      return bchaddr.toLegacyAddress(originalAddress);
    } else {
      return originalAddress;
    }
  };

  // transforms raw transactions associated with an address
  // into an array of processed transactions:
  // [ { blockHeight, txid, ins: [ { address, value }... ], outs: [ { address, value }...] } ]
  rawTransactions.forEach((tx: RawTransaction) => {
    const ins: Array<Operation> = [];
    const outs: Array<Operation> = [];

    // identify whether the address belongs to the list of transactors or not
    const addressBelongsToTransactors = (transactors: Transactors) => {
      return transactors.some((t) =>
        processAddress(t.address).includes(address.toString()),
      );
    };

    // the address currently being analyzed is a — recipient —
    if (addressBelongsToTransactors(tx.recipients)) {
      for (const recipient of tx.recipients) {
        if (processAddress(recipient.address).includes(address.toString())) {
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
      for (let i = 0; i < tx.recipients.length; i++) {
        const recipient = tx.recipients[i];

        // note: the amount sent is specified in blockchainSpecific.vout
        // _at the same index as the recipient_
        const op = new Operation(
          String(tx.timestamp),
          new BigNumber(tx.blockchainSpecific.vout[i].value),
        );

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

/**
 * get all normalized transactions related to an account-based address
 * @param address an account-based address (typically Ethereum)
 */
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

    // the address currently being analyzed is a — recipient —
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

    // the address currently being analyzed is a — sender —
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

/**
 * get all normalized token-related transactions associated with an account-based address
 * @param address an account-based address (typically Ethereum)
 */
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

    // the address currently being analyzed is a — recipient —
    for (const recipient of tx.recipients) {
      if (
        recipient.address.toLocaleLowerCase() ===
        address.toString().toLocaleLowerCase()
      ) {
        amount = amount.plus(recipient.amount);
      }
    }

    // the address currently being analyzed is a — sender —
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

    // the address currently being analyzed is a — recipient —
    if (isRecipient) {
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

    // the address currently being analyzed is a — sender —
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

/**
 * get all normalized internal transactions associated with an account-based address
 * @param address an account-based address (typically Ethereum)
 */
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

    // the address currently being analyzed is a — recipient —
    if (isRecipient) {
      const fixedAmount = amount.toFixed(ETH_FIXED_PRECISION);
      const op = new Operation(timestamp, new BigNumber(fixedAmount)); // ETH: use fixed-point notation
      op.setAddress(address.toString());
      op.setTxid(tx.parentHash);

      op.setOperationType("SCI (recipient)");

      op.setBlockNumber(tx.minedInBlockHeight);

      address.addFundedOperation(op);
    }

    // the address currently being analyzed is a — sender —
    if (isSender) {
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
