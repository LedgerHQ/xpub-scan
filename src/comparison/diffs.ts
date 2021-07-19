import BigNumber from "bignumber.js";
import chalk from "chalk";
import { toBaseUnit, toUnprefixedCashAddress } from "../helpers";
import { Comparison } from "../models/comparison";

/**
 * Show differences between imported and actual data
 * @param  {number} actualBalance
 *          Actual balance
 * @param  {number} importedBalance?
 *          Optional imported balance
 * @param  {Comparison[]} comparisons?
 *          Optional list of comparisons
 * @param  {boolean} diff?
 *          Optional diff boolean
 * @returns number
 *          An exist code:
 *              - zero if no diff
 *              - non-zero otherwise
 */
const showDiff = (
  actualBalance: number,
  importedBalance?: string,
  comparisons?: Comparison[],
  diff?: boolean,
): number => {
  let exitCode = 0;

  // check operations
  if (comparisons && diff) {
    const operationsMismatches = comparisons.filter(
      (comparison) => !comparison.status.startsWith("Match"),
    );

    const mismatches = [];

    for (const o of operationsMismatches) {
      mismatches.push({
        imported:
          typeof o.imported !== "undefined"
            ? {
                ...o.imported,
                amount: o.imported.amount.toFixed(),
              }
            : undefined,
        actual:
          typeof o.actual !== "undefined"
            ? {
                ...o.actual,
                cashAddress: toUnprefixedCashAddress(o.actual.address),
                amount: o.actual.amount.toFixed(),
              }
            : undefined,
        status: o.status,
      });
    }

    if (mismatches.length > 0) {
      console.log(chalk.redBright("Diff [ KO ]: operations mismatches"));
      console.dir(mismatches);
      exitCode += 1;
    } else {
      console.log(chalk.greenBright("Diff [ OK ]: operations match"));
    }
  }

  // check balance
  if (importedBalance) {
    const imported = new BigNumber(importedBalance).toFixed(0);
    const actual = toBaseUnit(new BigNumber(actualBalance));

    if (imported !== actual) {
      console.log(chalk.redBright("Diff [ KO ]: balances mismatch"));

      console.log("| imported balance: ", imported);
      console.log("| actual balance:   ", actual);

      exitCode += 2;
    } else {
      console.log(
        chalk.greenBright("Diff [ OK ]: balances match: ".concat(actual)),
      );
    }
  }

  // exit codes:
  //  0: OK
  //  1: operation(s) mismatch(es)
  //  2: balance mismatch
  //  3: operation(s) _and_ balance mismatches
  return exitCode;
};

export { showDiff };
