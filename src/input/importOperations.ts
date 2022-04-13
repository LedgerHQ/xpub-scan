import fs from "fs";
import chalk from "chalk";

import { Operation } from "../models/operation";
import { configuration, ETH_FIXED_PRECISION } from "../configuration/settings";
import BigNumber from "bignumber.js";
import * as helpers from "../helpers";
import { currencies } from "../configuration/currencies";

/**
 * Remove forbidden chars from address(es)
 * note that comma (,) are allowed to render concatenated
 * addresses
 * @param  {string} address
 *        An inputed address or an aggregated list of inputed addresses
 * @returns string
 *        A sanitized address or a sanitized aggregated list of addresses
 */
const sanitizeInputedAddress = (address: string): string => {
  return address.replace(/[^0-9a-zA-Z,]/gi, "");
};

/**
 * Get contents from file to import
 * @param  {string} path
 *          Path of file to import
 * @returns string
 *          Imported contents
 */
const getFileContents = (path: string): string => {
  if (!fs.existsSync(path)) {
    throw new Error("Imported file " + path + " does not exist");
  }
  return fs.readFileSync(path, "utf-8");
};

/**
 * Import transactions from a Custom G CSV
 * @param  {string} contents
 *          Contents from file to import
 * @returns Operation
 *          Imported operations
 */
const importFromCustomGCSV = (contents: string): Array<Operation> => {
  const operations: Array<Operation> = [];

  // temporary fix: offset if CSV refers to storageLimit
  // (only columns with index > 14 have to be offsetted in this situation)
  const offset = contents.includes("storageLimit") ? 2 : 1;

  contents
    .split(/\r?\n/)
    .slice(1)
    .forEach((line) => {
      // split using delimiter ',' except when between double quotes
      // as a Custom G CSV can have several addresses in the same field:
      // ...,'<address1>,<address2>,<address3',...
      const tokens = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

      if (tokens.length < 20) {
        return;
      }

      // expected date format: yyyy-MM-dd HH:mm:ss
      const date =
        /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/gi.exec(tokens[0]) || "";

      const type = String(tokens[2]); // CREDIT || DEBIT
      const status = String(tokens[4]); // CONFIRMED || ABORTED
      const amount = tokens[8]; // in unit of account
      const txid = tokens[16 + offset];
      const sender = tokens[17 + offset];
      const recipient = tokens[18 + offset];

      // process only confirmed transactions
      if (status === "CONFIRMED") {
        if (type === "CREDIT") {
          const op = new Operation(date[0], amount);
          op.setTxid(txid);

          // recipient: one address or several concatenated addresses
          // ! for this type of CSV, this field is required and should
          // default to a non-empty string (here: `(no address)`) to
          // ensure that an operation without address results in a mismatch
          op.setAddress(sanitizeInputedAddress(recipient));

          op.setOperationType("Received");

          operations.push(op);
        } else if (type === "DEBIT") {
          const op = new Operation(date[0], amount);
          op.setTxid(txid);

          // sender: one address or several concatenated addresses
          // ! for this type of CSV, this field is required and should
          // default to a non-empty string (here: `(no address)`) to
          // ensure that an operation without address results in a mismatch
          op.setAddress(sanitizeInputedAddress(sender));

          op.setOperationType("Sent");

          operations.push(op);
        }
      }
    });

  return operations;
};

/**
 * Import transactions from a Live Desktop CSV
 * @param  {string} contents
 *          Contents from file to import
 * @returns Operation
 *          Imported operations
 */
const importFromLiveDesktopCSV = (contents: string): Array<Operation> => {
  const operations: Array<Operation> = [];

  contents
    .split(/\r?\n/)
    .slice(1)
    .forEach((line: string) => {
      const tokens = line.split(/,/);

      if (tokens.length < 8) {
        return;
      }

      // expected date format: yyyy-MM-dd HH:mm:ss
      const date =
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/gi.exec(tokens[0]) || "";

      const currency = tokens[1];

      // skip currencies not relevant to the comparison
      if (
        currency.toUpperCase() !== configuration.currency.symbol.toUpperCase()
      ) {
        return;
      }

      const type = String(tokens[2]); // IN | OUT
      const fees = tokens[4] !== "" ? tokens[4] : 0; // in unit of account
      const txid = tokens[5];

      let amount = tokens[3]; // in unit of account

      // note: type B CSV does not refer to addresses
      if (type === "IN") {
        // if ETH, use fixed-point notation
        amount =
          configuration.currency.symbol === currencies.eth.symbol
            ? new BigNumber(tokens[3]).toFixed(ETH_FIXED_PRECISION)
            : new BigNumber(tokens[3]).toFixed();

        const op = new Operation(date[0], amount);
        op.setTxid(txid);
        op.setOperationType("Received");

        operations.push(op);
      } else if (type === "OUT") {
        // out transactions: substract fees from amount (in base unit)...
        // and if ETH, use fixed-point notation
        amount =
          configuration.currency.symbol === currencies.eth.symbol
            ? new BigNumber(amount)
                .minus(new BigNumber(fees))
                .toFixed(ETH_FIXED_PRECISION)
            : new BigNumber(amount).minus(new BigNumber(fees)).toFixed();

        // ... and convert the total back to unit of account
        // (otherwise, there would be floating number issues)
        const op = new Operation(date[0], amount);
        op.setTxid(txid);
        op.setOperationType("Sent");

        operations.push(op);
      }
    });

  return operations;
};

/**
 * Import transactions from a type A JSON
 * @param  {string} contents
 *          Contents from file to import
 * @returns Operation
 *          Imported operations
 */
const importFromJSONTypeA = (contents: string): Array<Operation> => {
  const operations: Array<Operation> = [];

  let ops;

  try {
    ops = JSON.parse(contents).operations;
  } catch (err) {
    throw new Error("JSON parsing error");
  }

  for (const operation of ops) {
    const type = operation.operation_type;

    const date =
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/gi.exec(
        operation.transaction.received_at,
      ) || "";

    const txid = operation.hash;
    const valueInBaseUnit = new BigNumber(operation.amount); // in base unit
    const feesInBaseUnit = new BigNumber(operation.fees); // in base unit

    if (type === "receive") {
      const op = new Operation(date[0], helpers.toAccountUnit(valueInBaseUnit));
      op.setTxid(txid);
      op.setOperationType("Received");

      const addresses = [];
      for (const output of operation.transaction.outputs) {
        if (output.derivation !== null) {
          addresses.push(output.address);
        }
      }

      op.setAddress(sanitizeInputedAddress(addresses.join(",")));

      operations.push(op);
    } else if (type === "send") {
      // out transactions: substract fees from amount (in base unit)...
      const amountInBaseUnit = valueInBaseUnit.minus(feesInBaseUnit);
      // ... and convert the total back to unit of account
      // (otherwise, there would be floating number issues)
      const op = new Operation(
        date[0],
        helpers.toAccountUnit(amountInBaseUnit),
      );
      op.setTxid(txid);
      op.setOperationType("Sent");

      const addresses = [];
      for (const input of operation.transaction.inputs) {
        if (input.derivation !== null) {
          addresses.push(input.address);
        }
      }

      op.setAddress(sanitizeInputedAddress(addresses.join(",")));

      operations.push(op);
    }
  }

  return operations;
};

/**
 * Import transactions from a Live Common JSON
 * @param  {string} contents
 *          Contents from file to import
 * @returns Operation
 *          Imported operations
 */
const importFromLiveCommonJSON = (contents: string): Array<Operation> => {
  const operations: Array<Operation> = [];

  let ops;

  try {
    ops = JSON.parse(contents).operations;
  } catch (err) {
    throw new Error("JSON parsing error");
  }

  for (const operation of ops) {
    const type = operation.type;

    const date =
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/gi.exec(operation.date) || "";

    const txid = operation.hash;
    const valueInBaseUnit = new BigNumber(operation.value); // in base unit
    const feesInBaseUnit = new BigNumber(operation.fee); // in base unit
    const recipient = operation.recipients.join(",");
    const sender = operation.senders.join(",");

    if (type === "IN") {
      const op = new Operation(date[0], helpers.toAccountUnit(valueInBaseUnit));
      op.setTxid(txid);
      op.setOperationType("Received");

      if (configuration.currency.symbol === currencies.bch.symbol) {
        // BCH: Live-common returns the cash address format
        op.setCashAddress(sanitizeInputedAddress(recipient));
      } else {
        op.setAddress(sanitizeInputedAddress(recipient));
      }

      operations.push(op);
    } else if (type === "OUT") {
      // out transactions: substract fees from amount (in base unit)...
      const amountInBaseUnit = valueInBaseUnit.minus(feesInBaseUnit);
      // ... and convert the total back to unit of account
      // (otherwise, there would be floating number issues)
      const op = new Operation(
        date[0],
        helpers.toAccountUnit(amountInBaseUnit),
      );
      op.setTxid(txid);
      op.setOperationType("Sent");

      if (configuration.currency.symbol === currencies.bch.symbol) {
        // BCH: Live-common returns the cash address format
        op.setCashAddress(sanitizeInputedAddress(sender));
      } else {
        op.setAddress(sanitizeInputedAddress(sender));
      }

      operations.push(op);
    }
  }

  return operations;
};

/**
 * Import transactions from a Custom W JSON
 * @param  {string} contents
 *          Contents from file to import
 * @returns Operation
 *          Imported operations
 */
const importFromCustomWJSON = (contents: string): Array<Operation> => {
  const operations: Array<Operation> = [];

  let ops;

  try {
    ops = JSON.parse(contents).operations;
  } catch (err) {
    throw new Error("JSON parsing error");
  }

  for (const operation of ops) {
    const type = operation.type;
    const amount = helpers.toAccountUnit(new BigNumber(operation.amount));
    const txid = operation.transaction.hash;

    const date =
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/gi.exec(operation.time) || "";

    const token = operation.token;

    let op = new Operation();

    if (type === "RECEIVE") {
      op = new Operation(date[0], amount);
      op.setOperationType("Received");
      op.setTxid(txid);

      const addresses = [];
      for (const output of operation.recipients) {
        addresses.push(output);
      }

      op.setAddress(sanitizeInputedAddress(addresses.join(",")));
    } else if (type === "SEND") {
      op = new Operation(date[0], amount);

      op.setOperationType("Sent");
      op.setTxid(txid);

      const addresses = [];
      for (const input of operation.senders) {
        addresses.push(input);
      }

      op.setAddress(sanitizeInputedAddress(addresses.join(",")));
    } else if (type === "NONE") {
      op = new Operation(date[0], new BigNumber(0));

      op.setOperationType("SCI (recipient)");
      op.setTxid(txid);
    }

    if (typeof token !== "undefined") {
      configuration.augmentedImport = true;
      const tokenAmount = new BigNumber(token.amount).dividedBy(
        10 ** token.magnitude,
      );
      op.addToken(token.symbol, token.name, new BigNumber(tokenAmount));
    }

    // TODO: enable Dapps import when this object will contain
    // more information
    //
    // const dapp = operation.dapp;
    // if (typeof dapp !== "undefined") {
    // configuration.augmentedImport = true;
    //   op.addDapp(dapp.contract_name);
    // }

    operations.push(op);
  }

  return operations;
};

/**
 * Dispatcher: detect the type of the imported file
 * based on its contents
 * @param  {string} path
 *          Path of file to import
 * @returns Operation
 *          Imported transactions
 */
const importOperations = (path: string): Array<Operation> => {
  const contents = getFileContents(path);

  const firstLine = contents.split(/\r?\n/)[0].replace('"', "");

  let operations: Array<Operation> = [];

  // CSV FILES
  if (firstLine.substring(0, 8) === "Creation") {
    // Custom G CSV: 'Creation' is the first token
    operations = importFromCustomGCSV(contents);
  } else if (firstLine.substring(0, 9) === "Operation") {
    // Live Desktop CSV: 'Operation' is the first token
    operations = importFromLiveDesktopCSV(contents);
  }

  // JSON FILES
  else if (firstLine.startsWith("{") || firstLine.startsWith("[")) {
    if (contents.includes("cursor")) {
      // type A JSON: contains a reference to 'cursor',
      //              an ambiguous term, but sufficient to
      //              distinguish it from type Live Common JSON files
      operations = importFromJSONTypeA(contents);
    } else if (contents.includes("seedIdentifier")) {
      // Live Common JSON: contains an explicit reference to 'seedIdentifier'
      operations = importFromLiveCommonJSON(contents);
    } else if (contents.includes("uid")) {
      // Custom W JSON: contains an explicit reference to 'uid'
      operations = importFromCustomWJSON(contents);
    }
  } else {
    throw new Error("Format not recognized.");
  }

  if (!configuration.silent) {
    console.log(
      chalk.grey(
        String(operations.length).concat(" operations have been imported"),
      ),
    );
  }

  // TODO: at this point, generate a warning/error
  // message if no operation has been imported
  // (file parsing issue?)

  return operations;
};

export { importOperations };
