import chalk from "chalk";
import { Comparison } from "../models/comparison";

const sb = require("satoshi-bitcoin");

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
  importedBalance?: number,
  comparisons?: Comparison[],
  diff?: boolean,
): number => {
  let exitCode = 0;

  // check operations
  if (comparisons && diff) {
    const operationsMismatches = comparisons.filter(
      (comparison) => !comparison.status.startsWith("Match"),
    );

    if (operationsMismatches.length > 0) {
      console.log(chalk.redBright("Diff [ KO ]: operations mismatches"));
      console.dir(operationsMismatches);
      exitCode += 1;
    } else {
      console.log(chalk.greenBright("Diff [ OK ]: operations match"));
    }
  }

  // check balance
  if (importedBalance || importedBalance === 0) {
    // the actual balance has to be converted into satoshis or similar units
    actualBalance = sb.toSatoshi(actualBalance);

    if (actualBalance !== importedBalance) {
      console.log(chalk.redBright("Diff [ KO ]: balances mismatch"));

      console.log("| imported balance:", importedBalance);
      console.log("| actual balance:  ", actualBalance);

      exitCode += 2;
    } else {
      console.log(
        chalk.greenBright(
          "Diff [ OK ]: balances match: ".concat(actualBalance.toString()),
        ),
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
