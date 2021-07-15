import BigNumber from "bignumber.js";
import chalk from "chalk";
import { currencies } from "../configuration/currencies";
import { configuration, ETH_FIXED_PRECISION } from "../configuration/settings";
import { toBaseUnit } from "../helpers";
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

    if (operationsMismatches.length > 0) {
      console.log(chalk.redBright("Diff [ KO ]: operations mismatches"));
      console.dir(operationsMismatches);
      exitCode += 1;
    } else {
      console.log(chalk.greenBright("Diff [ OK ]: operations match"));
    }
  }

  // check balance
  if (importedBalance) {
    let imported = "";
    let actual = "";

    // the actual balance has to be converted into base unit
    if (configuration.currency.utxo_based) {
      imported = new BigNumber(importedBalance).toString();
      actual = toBaseUnit(new BigNumber(actualBalance)).toString();
    } else if (configuration.currency.symbol === currencies.eth.symbol) {
      // ETH: use fixed-point notation
      imported = new BigNumber(importedBalance)
        .dividedBy(configuration.currency.precision)
        .toFixed(ETH_FIXED_PRECISION);
      actual = new BigNumber(actualBalance).toFixed(ETH_FIXED_PRECISION);
    }

    if (imported !== actual) {
      console.log(chalk.redBright("Diff [ KO ]: balances mismatch"));

      console.log("| imported balance: ", imported);
      console.log("| actual balance:   ", actual);

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
