import chalk from "chalk";

import { Address } from "../models/address";
import { Operation } from "../models/operation";
import { Comparison, ComparisonStatus } from "../models/comparison";
import { configuration } from "../configuration/settings";

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
 *          true if operations are matching
 *          false if operations are not matching
 */
const areMatching = (
  importedOperation: Operation,
  actualOperation: Operation,
): boolean => {
  const importedAddress = importedOperation.getAddress();

  // only check if imported address is set (not always the case: see type B CSV)
  // besides, imported address can be a superset of actual address as the
  // imported operation can have several addresses; therefore, `includes` has to
  // be used
  if (
    importedAddress &&
    !importedAddress.includes(actualOperation.getAddress()) &&
    !actualOperation.getAddress().includes(importedAddress)
  ) {
    return false;
  }

  if (importedOperation.amount !== actualOperation.amount) {
    return false;
  }

  return true;
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
    return "";
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
    case "Match (aggregated)":
    /* fallthrough */
    case "Mismatch":
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
    case "Mismatch":
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

const areAggregated = (
  importedOp: Operation,
  actualOps: Operation[],
): boolean => {
  if (typeof importedOp === "undefined") {
    return false;
  }

  const actual = actualOps.filter((op) => op.txid === importedOp.txid);

  if (actual.length < 2) {
    return false;
  }

  const totalAmount = actual.reduce((a, b) => a + b.amount, 0);

  return totalAmount === importedOp.amount;
};

/**
 * Compare the imported operations with the actual ones
 * @param  {Operation[]} importedOperations
 *          Imported operations
 * @param  {Operation[]} actualOperations
 *          Actual operations
 * @returns Comparison
 *          Result of the comparison
 *
 * TODO: handle aggregated operations
 */
const checkImportedOperations = (
  importedOperations: Operation[],
  actualOperations: Operation[],
  actualAddresses: Address[],
  partialComparison?: boolean,
): Comparison[] => {
  if (!configuration.silent) {
    console.log(
      chalk.bold.whiteBright(
        "\nComparison between imported and actual operations\n",
      ),
    );
    console.log(
      chalk.grey("imported operations\t\t\t\t\t\t\t\t     actual operations"),
    );
  }

  const allComparingCriteria: ComparingCriterion[] = []; // TODO: convert into a Set as they have to be unique
  const comparisons: Comparison[] = [];

  // filter imported operations if scan is limited (range scan)
  if (partialComparison) {
    const rangeAddresses = actualAddresses.map((address) => address.toString());

    importedOperations = importedOperations.filter((op) =>
      op.address.split(",").find((a) => rangeAddresses.includes(a)),
    );
  }

  importedOperations.forEach((op) => {
    if (!allComparingCriteria.some((t) => t.hash === op.txid)) {
      allComparingCriteria.push({
        date: op.date,
        hash: op.txid,
        block: op.block,
      });
    }
  });

  // add potential actual operations absent from the list
  // of imported operations
  actualOperations.forEach((op) => {
    if (!allComparingCriteria.some((t) => t.hash === op.txid)) {
      allComparingCriteria.push({
        date: op.date,
        hash: op.txid,
        block: op.block,
      });
    }
  });

  // sort by reverse chronological order
  allComparingCriteria.sort((a, b) =>
    a.date > b.date ? -1 : a.date < b.date ? 1 : 0,
  );

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
    // (see: type A CSV) that have to be reduced to only one:
    // the one corresponding to that of an actual operation from the same
    // block and with the same amount
    for (const imported of importedOps) {
      // do not continue if no address (see: type B CSVs): not relevant
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

    // sort I (common cases): compare by date, amount, address
    importedOps.sort(compareOps);
    actualOps.sort(compareOps);

    // sort II (edge cases):
    // sort operations with same txid, same date, and same amount
    // that cannot be sorted by address
    for (const criterion of allComparingCriteria) {
      const imported = importedOps.filter((op) => op.txid === criterion.hash);

      // if only one imported operation have this txid, skip
      if (imported.length < 2 || typeof criterion.hash === "undefined") {
        continue;
      }

      for (let i = 0; i < imported.length; ++i) {
        for (let j = 0; j < actualOps.length; ++j) {
          // if an actual operation having the same txid
          // has an identical address...
          if (
            actualOps[j].txid === imported[i].txid &&
            imported[i].address.includes(actualOps[j].address)
          ) {
            // ... swap it with the first actual operation
            [actualOps[0], actualOps[j]] = [actualOps[j], actualOps[0]];
            break;
          }
        }
      }
    }

    const aggregatedTxids: string[] = [];

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
        aggregatedTxids.push(actualOp.txid);

        if (typeof importedOp !== "undefined") {
          showOperations("Match (aggregated)", importedOp, actualOp);
        } else {
          showOperations("Missing (aggregated)", actualOp);
        }

        comparisons.push({
          imported: importedOp,
          actual: actualOp,
          status: "Match (aggregated)",
        });

        continue;
      }

      // actual operation with no corresponding imported operation
      if (typeof importedOp === "undefined") {
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
        showOperations("Extra Operation", importedOp);

        comparisons.push({
          imported: importedOp,
          actual: undefined,
          status: "Extra Operation",
        });

        continue;
      }

      if (!areMatching(importedOp, actualOp)) {
        // mismatch
        showOperations("Mismatch", importedOp, actualOp);

        comparisons.push({
          imported: importedOp,
          actual: actualOp,
          status: "Mismatch",
        });
      } else {
        // match
        showOperations("Match", importedOp, actualOp);

        comparisons.push({
          imported: importedOp,
          actual: actualOp,
          status: "Match",
        });
      }
    }
  }

  return comparisons;
};

export { checkImportedOperations };
