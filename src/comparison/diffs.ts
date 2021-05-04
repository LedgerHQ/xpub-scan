import chalk from "chalk";

// @ts-ignore
import sb from "satoshi-bitcoin";

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
const showDiff = (actualBalance: number, importedBalance?: number, comparisons?: Comparison[], diff?: boolean) : number => {
    let exitCode = 0;

    // check operations
    if (comparisons && diff) {
        const operationsMismatches = comparisons.filter(comparison => comparison.status !== "Match");

        if (operationsMismatches.length > 0) {
            console.log(chalk.redBright("Diff: operations mismatches"));
            console.dir(operationsMismatches);
            exitCode += 1;
        }
        else {
            console.log(
                chalk.greenBright("Diff: operations match")
            );
        }
    }

    // check balance
    if (importedBalance) {

      // the actual balance has to be converted into satoshis or similar units
      actualBalance = sb.toSatoshi(actualBalance);

      if (actualBalance !== importedBalance) {
        console.log(chalk.redBright("Diff: balances mismatch"));

        console.log("Imported balance:", importedBalance);
        console.log("Actual balance:  ", actualBalance);

        exitCode += 2;
      }
      else {
        console.log(
          chalk.greenBright("Diff: balances match: ".concat(actualBalance.toString()))
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