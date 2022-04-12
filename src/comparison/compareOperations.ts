import chalk from "chalk";

import { Address } from "../models/address";
import { Operation } from "../models/operation";
import { Comparison, ComparisonStatus } from "../models/comparison";
import { configuration } from "../configuration/settings";
import BigNumber from "bignumber.js";

// criterion by which operations can be compared
interface ComparingCriterion {
  date: string;
  hash: string;
  block: number;
}

/**
 * Sort by amount and, then, if needed, by address
 * @param  {Operation} A
 *          The first operation to compare
 * @param  {Operation} B
 *          The second operation to compare
 * @returns number
 *          -1 if A > B
 *           1 if A < B
 *           0 if A == B
 */
const compareOps = (A: Operation, B: Operation): number => {
  // date
  if (A.date > B.date) {
    return -1;
  }

  if (A.date < B.date) {
    return 1;
  }

  // amount
  if (A.amount > B.amount) {
    return -1;
  }

  if (A.amount < B.amount) {
    return 1;
  }

  // address
  if (A.address > B.address) {
    return -1;
  }

  if (A.address < B.address) {
    return 1;
  }

  return 0;
};

/**
 * Check whether imported and actual operation are matching or not
 * @param  {Operation} importedOperation
 *          An imported operation
 * @param  {Operation} actualOperation
 *          An actual operation
 * @returns boolean
 *          `true` if operations are matching
 *          `false` if operations are not matching
 */
const areMatching = (
  importedOperation: Operation,
  actualOperation: Operation,
): ComparisonStatus => {
  // ┏━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ 1 | CHECK ADDRESSES ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━┛

  // 1. Check addresses (general case)
  // only check if imported address is set (not always the case: Live Desktpop CSVs)
  // besides, imported address can be a superset of actual address as the
  // imported operation can have several addresses; therefore, `includes` has to
  // be used

  let mismatchingAddresses = false;

  const importedAddress = importedOperation.getAddress()?.toLowerCase();
  const actualAddress = actualOperation.getAddress().toLowerCase();

  if (
    importedAddress &&
    !importedAddress.includes(actualAddress) &&
    !actualAddress.includes(importedAddress)
  ) {
    mismatchingAddresses = true;
  }

  // 1b. Check addresses (Bitcoin Cash)
  const importedCashAddress = importedOperation.getCashAddress()?.toLowerCase();
  const actualCashAddress = actualOperation.getCashAddress()?.toLowerCase();

  if (
    importedCashAddress &&
    actualCashAddress &&
    !importedCashAddress.includes(actualCashAddress) &&
    !actualCashAddress.includes(importedCashAddress)
  ) {
    mismatchingAddresses = true;
  }

  if (mismatchingAddresses) {
    return "Mismatch: addresses";
  }

  // ┏━━━━━━━━━━━━━━━━━━━┓
  // ┃ 2 | CHECK AMOUNTS ┃
  // ┗━━━━━━━━━━━━━━━━━━━┛

  // Note: absolute values are compared because one of the amounts can be negative (i.e., swap)
  if (
    !importedOperation.amount
      .absoluteValue()
      .isEqualTo(actualOperation.amount.absoluteValue())
  ) {
    return "Mismatch: amounts";
  }

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ 3 | CHECK TOKENS (OPTIONAL) ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  // 3. (if applicable: augmented mode) check tokens
  const importedToken = importedOperation.token;
  const actualToken = actualOperation.token;

  if (
    typeof importedToken !== "undefined" &&
    typeof actualToken !== "undefined"
  ) {
    if (!importedToken.amount.isEqualTo(actualToken.amount)) {
      return "Mismatch: token amounts";
    }

    if (
      importedToken.symbol.toLocaleLowerCase() !==
      actualToken.symbol.toLocaleLowerCase()
    ) {
      return "Mismatch: token tickers";
    }
  }

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ 4 | CHECK DAPPS (OPTIONAL) ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  // 4. (if applicable: augmented mode) check dapp
  const importedDapp = importedOperation.dapp;
  const actualDapp = actualOperation.token; // currently, as far as the external provider is concerned, token == Dapp

  if (
    typeof importedDapp !== "undefined" &&
    typeof actualDapp !== "undefined"
  ) {
    if (
      importedDapp.contract_name.toLocaleLowerCase() !==
      actualDapp.name.toLocaleLowerCase()
    ) {
      return "Mismatch: Dapp";
    }
  }

  return "Match";
};

/**
 * Make addresses displayable
 * @param  {string} address
 *          An address to display
 * @returns string
 *          empty string if no address
 *          partial address + ellipsis if long address
 *          the address itself otherwise
 */
const renderAddress = (address: string): string => {
  const maxLength = 35;

  if (!address) {
    return "".padEnd(maxLength + 4, " ");
  }

  if (address.length < maxLength) {
    return address.padEnd(maxLength + 4, " ");
  }

  return address
    .substring(0, maxLength - 3)
    .concat("...")
    .padEnd(maxLength + 4, " ");
};

/**
 * Display the comparison between two operations or, if an operation
 * is missing, display one operation with the indication that one operation
 * is missing
 * @param  {ComparisonStatus} status
 *          Status of the comparison (Match, Mismatch, etc.)
 * @param  {Operation} A
 *          An operation
 * @param  {Operation} B?
 *          An optional operation
 * @returns void
 */
const showOperations = (
  status: ComparisonStatus,
  A: Operation,
  B?: Operation,
): void => {
  if (configuration.silent) {
    return;
  }

  const halfColorPadding = 84;
  const fullColorPadding = 85;

  let imported = "";
  let actual = "";

  switch (status) {
    case "Match":
    /* fallthrough */
    case status.match(/^Mismatch.*/)?.input:
      /* fallthrough */
      imported = A.date
        .padEnd(24, " ")
        .concat(renderAddress(A.address))
        .concat(String(A.amount));

      if (B) {
        actual = B.date
          .padEnd(24, " ")
          .concat(renderAddress(B.address))
          .concat(String(B.amount));
      }
      break;
    case "Extra Operation":
      actual = "(missing operation)";

      imported = A.date
        .padEnd(24, " ")
        .concat(renderAddress(A.address))
        .concat(String(A.amount));
      break;

    case "Missing Operation":
      imported = "(missing operation)";

      actual = A.date
        .padEnd(24, " ")
        .concat(renderAddress(A.address))
        .concat(String(A.amount));
      break;
    case "Missing (aggregated)":
      imported = "(aggregated operation)";

      actual = A.date
        .padEnd(24, " ")
        .concat(renderAddress(A.address))
        .concat(String(A.amount));
      break;
  }

  if (
    A.operationType === "Failed to send" ||
    B?.operationType === "Failed to send"
  ) {
    actual = chalk.blueBright(actual.concat("\t[failed]"));
  }

  if (A.operationType.includes("token") || B?.operationType.includes("token")) {
    actual = chalk.white(actual.concat("\t[token]"));
  }

  if (A.operationType.includes("dapp") || B?.operationType.includes("dapp")) {
    actual = chalk.white(actual.concat("\t[dapp]"));
  }

  if (A.operationType.includes("SCI") || B?.operationType.includes("SCI")) {
    actual = chalk.white(actual.concat("\t[sci]"));
  }

  if (
    A.operationType.includes("Swapped") ||
    B?.operationType.includes("Swapped")
  ) {
    actual = chalk.white(actual.concat("\t[swap]"));
  }

  switch (status) {
    case "Match":
      console.log(
        chalk.greenBright(imported.padEnd(halfColorPadding, " ")),
        actual,
      );
      break;
    case "Match (aggregated)":
    /* fallthrough */
    case "Missing (aggregated)":
      console.log(chalk.green(imported.padEnd(halfColorPadding, " ")), actual);
      break;
    case status.match(/^Mismatch.*/)?.input:
    /* fallthrough */
    case "Missing Operation":
    /* fallthrough */
    case "Extra Operation":
      console.log(
        chalk.redBright(imported.padEnd(fullColorPadding, " ").concat(actual)),
      );
      break;
  }
};

/**
 * Check whether operations are aggregated or not
 * @param  {Operation} importedOp
 *          An imported operation
 * @param  {Array<Operation>} actualOps
 *          List of actual operations
 * @returns boolean
 *          `true` if operations are aggregated
 *          `false` if operations are not aggregated
 */
const areAggregated = (
  importedOp: Operation,
  actualOps: Array<Operation>,
): boolean => {
  if (typeof importedOp === "undefined") {
    return false;
  }

  const actual = actualOps.filter((op) => op.txid === importedOp.txid);

  if (actual.length < 2) {
    return false;
  }

  let actualAmountTotal = new BigNumber(0);

  for (const actualOp of actualOps) {
    actualAmountTotal = actualAmountTotal.plus(actualOp.amount);
  }

  const importedAmount = new BigNumber(importedOp.amount);

  return actualAmountTotal.isEqualTo(importedAmount);
};

/**
 * Compare the imported operations with the actual ones
 * @param importedOperations operations from the product
 * @param actualOperations operations from the provider (source of truth)
 * @param actualAddresses actual addresses
 * @param partialComparison (optional) partial comparison
 * @returns list of comparisons
 */
const checkImportedOperations = (
  importedOperations: Array<Operation>,
  actualOperations: Array<Operation>,
  actualAddresses: Array<Address>,
  partialComparison?: boolean,
): Array<Comparison> => {
  if (!configuration.silent) {
    console.log(
      chalk.bold.whiteBright(
        "\nComparison between imported and actual operations\n",
      ),
    );
    console.log(
      chalk.grey(
        "imported operations" + "\t".repeat(8) + "     actual operations",
      ),
    );
  }

  const allComparingCriteria: Array<ComparingCriterion> = [];
  const comparisons: Array<Comparison> = [];
  const blockHeightUpperLimit = configuration.blockHeightUpperLimit;

  // filter imported operations if scan is limited (range scan)
  if (partialComparison) {
    const rangeAddresses = actualAddresses.map((address) => address.toString());

    importedOperations = importedOperations.filter((op) =>
      op.address.split(",").find((a) => rangeAddresses.includes(a)),
    );
  }

  // create a list of comparing criterion containing all elements that can be used
  // to compare transactions. That is: date, txid, and/or block number
  importedOperations.concat(actualOperations).forEach((op) => {
    if (!allComparingCriteria.some((t) => t.hash === op.txid)) {
      // (ignore duplicates)
      allComparingCriteria.push({
        date: op.date,
        hash: op.txid,
        block: op.block,
      });
    }
  });

  // sort by reverse chronological order
  allComparingCriteria.sort((a, b) => (a.date > b.date ? -1 : 1));

  for (const comparingCriterion of allComparingCriteria) {
    let importedOps;
    let actualOps;

    if (importedOperations.some((op) => typeof op.txid !== "undefined")) {
      // case 1. tx id is set
      importedOps = importedOperations.filter(
        (op) => op.txid === comparingCriterion.hash,
      );
      actualOps = actualOperations.filter(
        (op) => op.txid === comparingCriterion.hash,
      );
    } else {
      // case 2. tx id is NOT set: compare by block number instead
      importedOps = importedOperations.filter(
        (op) => op.block === comparingCriterion.block,
      );
      actualOps = actualOperations.filter(
        (op) => op.block === comparingCriterion.block,
      );
    }

    // the imported operations can have multiple concatenated addresses
    // that have to be reduced to only one:
    // the one corresponding to that of an actual operation from the same
    // block and with the same amount
    for (const imported of importedOps) {
      // do not continue if no address (see: Live Desktop CSVs): not relevant
      if (!imported.address) {
        break;
      }

      // the actual operation address must already be present in the
      // imported operations' addresses and the amount must match
      const actual = actualOperations.filter(
        (op) =>
          imported.address.includes(op.address) &&
          op.amount === imported.amount,
      );

      if (Object.keys(actual).length === 1) {
        imported.setAddress(actual[0].address);
      }
    }

    // sort I (common case):
    // compare by date, amount, address
    importedOps.sort(compareOps);
    actualOps.sort(compareOps);

    // sort II (edge case):
    // sort operations with same txid, same date, and same amount
    // that cannot be sorted by address
    for (const criterion of allComparingCriteria) {
      const imported = importedOps.filter((op) => op.txid === criterion.hash);

      // if only one imported operation have this txid, skip...
      if (imported.length < 2 || typeof criterion.hash === "undefined") {
        continue;
      }

      // ... otherwise, sort the imported operations
      for (const importedOp of imported) {
        for (let i = 0; i < actualOps.length; ++i) {
          // if an actual operation is having the same txid,
          // but the operation types or addresses differ...
          if (
            // [ an actual operation has the same txid,
            (actualOps[i].txid === importedOp.txid &&
              // and:
              // 1. the operation type is the same {use of
              //    `startsWith` as the actual operation types are
              //    a superset of imported operation types:
              //       - Send (to self, to sibling);
              //       - Received ((non-sibling to change))},
              !actualOps[i]
                .getOperationType()
                .startsWith(importedOp.getOperationType())) ||
            // and
            // 2. the imported operation does include the actual
            //    address (`includes`: imported addresses can be aggregated) ]
            (importedOp.address &&
              !importedOp.address.includes(actualOps[i].address))
          ) {
            // ... then swap it with first actual operation
            [actualOps[0], actualOps[i]] = [actualOps[i], actualOps[0]];
            break;
          }
        }
      }
    }

    const aggregatedTxids: Array<string> = [];

    // Math.max(...) used here because the imported and actual arrays do not
    // necessarily have the same size (i.e. missing operations)
    for (let i = 0; i < Math.max(importedOps.length, actualOps.length); ++i) {
      const importedOp = importedOps[i];
      const actualOp = actualOps[i];

      // aggregated operations
      // (fixes https://github.com/LedgerHQ/xpub-scan/issues/23)
      if (
        typeof actualOp !== "undefined" &&
        (aggregatedTxids.includes(actualOp.txid) ||
          areAggregated(importedOp, actualOps))
      ) {
        // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
        // ┃ CASE 1 | AGGREGATED OPERATIONS ┃
        // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

        aggregatedTxids.push(actualOp.txid);

        if (typeof importedOp !== "undefined") {
          // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
          // ┃ CASE 1A | MATCHING AGGREGATED OPERATIONS ┃
          // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

          showOperations("Match (aggregated)", importedOp, actualOp);

          comparisons.push({
            imported: importedOp,
            actual: actualOp,
            status: "Match (aggregated)",
          });
        } else {
          // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
          // ┃ CASE 1B | MISSING AGGREGATED OPERATIONS ┃
          // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

          showOperations("Missing (aggregated)", actualOp);

          comparisons.push({
            imported: importedOp,
            actual: actualOp,
            status: "Missing (aggregated)",
          });
        }

        continue;
      }

      // actual operation with no corresponding imported operation
      if (typeof importedOp === "undefined") {
        // if the block height upper limit is reached, skip the comparison...
        if (
          blockHeightUpperLimit > 0 &&
          actualOp.getBlockNumber() > blockHeightUpperLimit
        ) {
          // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
          // ┃ CASE 2 | SKIPPED OPERATIONS (BLOCK HEIGHT UPPER LIMIT MODE) ┃
          // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

          comparisons.push({
            imported: undefined,
            actual: actualOp,
            status: "Skipped",
          });

          continue;
        }

        // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
        // ┃ CASE 3 | MISSING OPERATION ┃
        // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

        // ...else, this is a missing operation
        showOperations("Missing Operation", actualOp);

        comparisons.push({
          imported: undefined,
          actual: actualOp,
          status: "Missing Operation",
        });

        continue;
      }

      // imported operation with no corresponding actual operation
      if (typeof actualOp === "undefined") {
        // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
        // ┃ CASE 4 | EXTRA OPERATION ┃
        // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛

        showOperations("Extra Operation", importedOp);

        comparisons.push({
          imported: importedOp,
          actual: undefined,
          status: "Extra Operation",
        });

        continue;
      }

      const comparisonResult = areMatching(importedOp, actualOp);

      if (comparisonResult !== "Match") {
        // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
        // ┃ CASE 5 | MISMATCHING OPERATIONS ┃
        // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

        showOperations(comparisonResult, importedOp, actualOp);

        comparisons.push({
          imported: importedOp,
          actual: actualOp,
          status: comparisonResult,
        });
      } else {
        // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
        // ┃ CASE 6 | MATCHING OPERATIONS ┃
        // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

        showOperations("Match", importedOp, actualOp);

        comparisons.push({
          imported: importedOp,
          actual: actualOp,
          status: "Match",
        });
      }
    }
  }

  // Sort the comparisons

  // 1. Split the comparisons in two segments:
  //   first segment (can be empty): skipped comparisons
  //   second segment: unskipped comparisons
  const skippedComparisons: Array<Comparison> = [];
  for (let i = comparisons.length - 1; i >= 0; i--) {
    const comparison = comparisons[i];

    if (comparison.status === "Skipped") {
      skippedComparisons.push(comparison);
      comparisons.splice(i, 1);
    }
  }

  // 2. Sort the skipped comparisons by date
  skippedComparisons.sort((a, b) => {
    return a.actual!.date > b.actual!.date ? -1 : 1;
  });

  // 3. Merge the two segments into one.
  // The comparisons are then sorted this way:
  //   first: all skipped comparisons, sorted by date
  //   second: all unskipped comparisons, sorted following the
  //           imported operations ordering
  return skippedComparisons.concat(comparisons);
};

export { checkImportedOperations };
