import readline from "readline";
import chalk from "chalk";

import { Address } from "./models/address";
import { Operation } from "./models/operation";
import { configuration } from "./configuration/settings";
import { TODO_TypeThis } from "./types";
import { currencies } from "./configuration/currencies";
import BigNumber from "bignumber.js";

function renderAmount(amount: BigNumber): string {
  // Currently, this function does not convert the amounts
  // into relevant units. But in the future, if the API
  // changes, it would allow to change the unit
  // depending on the network.
  // For example:
  // if (configuration.currency.symbol === currencies.btc.symbol) {
  //   return sb.toAccountUnit(amount);
  // }
  if (amount.isZero()) {
    return String(amount);
  } else {
    // 8 digital places max without trailing 0s
    return amount.toFixed(8);
  }
}

// display the active/probed address with its stats
function updateAddressDetails(address: Address) {
  // silent mode: do not display anything
  if (configuration.silent) {
    return;
  }

  // quiet mode: only display full information, once
  if (configuration.quiet && typeof address.getStats() === "undefined") {
    return;
  }

  const derivationMode = address.getDerivationMode();
  const account = address.getDerivation().account;
  const index = address.getDerivation().index;

  const derivationPath = "m/"
    .concat(String(account))
    .concat("/")
    .concat(String(index));

  const addressStats = address.getStats();

  // _type_  path  address ...
  let stats = "";

  if (configuration.currency.utxo_based) {
    //    _{derivation mode}_  {derivation path}  {address}  [{cash address}]...
    stats = stats
      .concat(chalk.italic(derivationMode.padEnd(16, " ")))
      .concat(derivationPath.padEnd(12, " "));
  } else {
    stats = stats.concat("\t");
  }

  const cashAddress = address.asCashAddress();

  if (typeof cashAddress !== "undefined") {
    stats = stats
      .concat(address.toString().padEnd(36, " "))
      .concat(cashAddress.padEnd(46, " "));
  } else {
    stats = stats.concat(address.toString().padEnd(46, " "));
  }

  if (typeof address.getStats() === "undefined") {
    // if no stats, display just half of the line
    process.stdout.write(stats);
    return;
  } else {
    // else, display the full line
    const balance = address.getBalance();
    const fundedSum = renderAmount(addressStats.funded);

    transientLine(/* delete line to display complete info */);

    // ... +{total funded} ←
    stats = stats
      .concat(balance.toString().padEnd(16, " "))
      .concat("+")
      .concat(fundedSum.padEnd(14, " ")) // an active address has necessarily been funded,
      .concat(" ←"); // thus this information is mandatory
  }

  // optional: spent sum
  if (typeof addressStats.spent !== "undefined") {
    const spentSum = renderAmount(addressStats.spent);

    // ... -{total spent} →
    stats = stats.concat("\t-").concat(spentSum.padEnd(14, " ")).concat(" →");
  }

  console.log(stats);
}

// display the list of UTXOs sorted by date (reverse chronological order)
function showSortedUTXOs(sortedUTXOs: Address[]) {
  if (configuration.silent || !configuration.currency.utxo_based) {
    return;
  }

  console.log(chalk.bold("\nUTXOs\n"));

  if (sortedUTXOs.length === 0) {
    console.log(chalk.gray("(no UTXO)"));
    return;
  }

  sortedUTXOs.forEach((utxo) => {
    updateAddressDetails(utxo);
  });
}

// display the list of operations sorted by date (reverse chronological order)
function showSortedOperations(sortedOperations: Operation[]) {
  if (configuration.silent) {
    return;
  }

  process.stdout.write(chalk.bold("\nOperations History"));

  if (typeof configuration.APIKey === "undefined") {
    // warning related to the limitations of the default provider
    process.stdout.write(
      chalk.redBright(
        " (only the last ~50 operations by address are displayed)\n",
      ),
    );
  } else {
    process.stdout.write("\n");
  }

  const header =
    "\ndate\t\t\tblock\t\taddress\t\t\t\t\t\treceived (←) [as change from non-sibling (c)] | sent (→) to self (⮂) or sibling (↺)";
  console.log(chalk.grey(header));

  sortedOperations.forEach((op) => {
    const amount = renderAmount(op.amount).padEnd(12, " ");

    // {date} {block} {address} [{cash address}]
    let status = op.date
      .padEnd(20, " ")
      .concat("\t")
      .concat(String(op.block).padEnd(8, " "));

    const address = op.address;
    const cashAddress = op.cashAddress;

    if (typeof cashAddress !== "undefined") {
      status = status
        .concat(address.padEnd(36, " "))
        .concat(cashAddress.padEnd(46, " "));
    } else {
      status = status.concat("\t").concat(address.padEnd(42, " ")).concat("\t");
    }

    if (
      op.operationType === "Received" ||
      op.operationType === "Received (non-sibling to change)"
    ) {
      // ... +{amount} ←
      status = status.concat("+").concat(amount).concat(" ←");

      if (op.operationType === "Received (non-sibling to change)") {
        status = status.concat(" c");
      }
    } else {
      // ... -{amount} →|⮂|↺
      status = status.concat("-").concat(amount);

      const operationType = op.getOperationType();

      if (operationType === "Sent to self") {
        // case 1. Sent to the same address
        status = status.concat(" ⮂");
      } else if (operationType === "Sent to sibling") {
        // case 2. Sent to a sibling address
        // (different non-change address belonging to same xpub)
        status = status.concat(" ↺");
      } else {
        // case 3. Sent to external address
        status = status.concat(" →");
      }
    }

    console.log(status);
  });

  console.log(chalk.bold("\nNumber of transactions\n"));
  console.log(chalk.whiteBright(sortedOperations.length));
}

// display the summary: total balance by address type
function showSummary(derivationMode: string, totalBalance: string) {
  if (configuration.silent) {
    return;
  }

  if (configuration.currency.symbol == currencies.eth.symbol) {
    derivationMode = "Ethereum";
  }

  const balance = renderAmount(new BigNumber(totalBalance));

  if (balance === "0") {
    console.log(
      chalk.grey(
        derivationMode.padEnd(16, " ").concat(balance.padEnd(12, " ")),
      ),
    );
  } else {
    console.log(
      chalk
        .whiteBright(derivationMode.padEnd(16, " "))
        .concat(chalk.greenBright(balance.padEnd(12, " "))),
    );
  }
}

function logStatus(status: string) {
  if (configuration.silent) {
    return;
  }

  console.log(chalk.dim(status));
}

// overwrite last displayed line
// (no message: delete the line)
//
// note: if this implementation is modified,
// always check the resulting behavior in
// Docker
function transientLine(message?: string) {
  if (configuration.silent || configuration.quiet) {
    return;
  }

  readline.cursorTo(process.stdout, 0);

  if (typeof message !== "undefined") {
    process.stdout.write(message);
  } else {
    // blank line
    // ! solution implemented this way to be
    // ! compatible with Docker
    process.stdout.write("".padEnd(140, " "));
    readline.cursorTo(process.stdout, 0);
  }
}

function showResults(
  sortedUTXOs: Address[],
  sortedOperations: Operation[],
  summary: TODO_TypeThis[],
) {
  if (configuration.silent) {
    return;
  }

  showSortedUTXOs(sortedUTXOs);
  showSortedOperations(sortedOperations);

  console.log(chalk.bold("\nSummary\n"));
  for (const total of summary) {
    showSummary(total.derivationMode, total.balance);
  }
}

export {
  showSummary,
  logStatus,
  updateAddressDetails,
  showSortedOperations,
  transientLine,
  showResults,
};
