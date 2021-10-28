import fs from "fs";
import minifier from "html-minifier";

import {
  configuration,
  EXTERNAL_EXPLORERS_URLS,
} from "../configuration/settings";
import { reportTemplate } from "../templates/report.html";
import { toAccountUnit, toBaseUnit, toUnprefixedCashAddress } from "../helpers";
import { Address } from "../models/address";
import { TODO_TypeThis } from "../types";
import { currencies } from "../configuration/currencies";
import BigNumber from "bignumber.js";
import { ComparisonStatus } from "../models/comparison";

function renderToken(token: any, status?: ComparisonStatus) {
  const renderedAmount = new BigNumber(token.amount).toFormat(6);

  let renderedToken =
    `<br><span class="token_details` +
    (typeof status == "undefined" || status.includes("Match")
      ? ``
      : ` token_mismatch`) +
    `">`;
  renderedToken += `${parseFloat(renderedAmount)} ${token.symbol}<br>${
    token.name
  }</span>`;
  return renderedToken;
}

// align float numbers or zeros
function renderAmount(amount: string | number) {
  const decimalPrecision = 8;
  const filler = "¤"; // (any non-numeric non-dot char)
  let renderedAmount: string;
  const n = new BigNumber(amount);

  if (n.isZero()) {
    // align '0': insert filler on the right
    renderedAmount = "0".padEnd(decimalPrecision + 4, filler);
  } else {
    renderedAmount = toAccountUnit(n, 8);
  }

  // align any number: insert filler on the left
  renderedAmount = renderedAmount.padStart(decimalPrecision * 2, filler);

  renderedAmount = renderedAmount.replace(/^0+(\d)|(\d)0+$/gm, "$1$2"); // remove trailing zeros

  // insert non-breaking spaces by replacing the filler with `&nbsp;`
  return (
    '<span class="monospaced">' +
    renderedAmount.split(filler).join("&nbsp;") +
    "</span>"
  );
}

// generate the url to an external explorer allowing to get more info
// regarding an item (address or transaction)
function getUrl(itemType: string, item: string) {
  // general case (Bitcoin, Litecoin)
  // --------------------------------
  let url = EXTERNAL_EXPLORERS_URLS.general;
  const itemTypes = {
    address: "address",
    transaction: "tx",
  };

  // exception(s)
  // ------------

  // Testnet
  if (configuration.testnet) {
    url = url.replace("{coin}", "{coin}-testnet");
  }

  // Bitcoin Cash
  //
  // coin:        "bitcoin-cash"
  // item types:  "address" | "transaction"
  if (configuration.currency.symbol === currencies.bch.symbol) {
    url = EXTERNAL_EXPLORERS_URLS.bch;
    url = url.replace("{coin}", "bitcoin-cash");
    itemTypes.address = "address";
    itemTypes.transaction = "transaction";
  }

  // Ethereum
  //
  // item types:  "address" | "tx"
  if (configuration.currency.symbol === currencies.eth.symbol) {
    url = EXTERNAL_EXPLORERS_URLS.eth;
    itemTypes.address = "address";
    itemTypes.transaction = "tx";
  }

  // specify item type
  switch (itemType) {
    case "address":
      url = url.replace("{type}", itemTypes.address);
      break;
    case "transaction":
      url = url.replace("{type}", itemTypes.transaction);
      break;
    default:
      throw new Error(
        'Unrecognized item type "' +
          itemType +
          "\" (expected: 'address' or 'transaction')",
      );
  }

  return url
    .replace("{coin}", configuration.currency.symbol.toLowerCase())
    .replace("{item}", item);
}

// make address clickable
function addressAsLink(address: string) {
  // if no address, return empty string
  // (used for CSV files that do not contain any address)
  if (typeof address === "undefined") {
    return "";
  }

  const url = getUrl("address", address);

  address = address.length < 45 ? address : address.substring(0, 45) + "...";

  return (
    '<a class="monospaced" href="' + url + '" target=_blank>' + address + "</a>"
  );
}

function renderAddress(address: string, cashAddress?: string) {
  const renderedAddress = addressAsLink(address);

  if (configuration.currency.symbol !== currencies.bch.symbol || !cashAddress) {
    return renderedAddress;
  } else {
    // Bitcoin Cash: handle Legacy/Cash address duality:
    //  {legacy}
    //  {Cash address}
    return renderedAddress.concat("</br>").concat(addressAsLink(cashAddress));
  }
}

// make TXID clickable
function renderTxid(txid?: string) {
  if (!txid) {
    return "(no txid)";
  }

  const url = getUrl("transaction", txid);

  txid = txid.substring(0, 10) + "...";

  return (
    '<a class="monospaced" href="' + url + '" target=_blank>' + txid + "</a>"
  );
}

// explain some operation types
function createTooltip(opType: string) {
  if (opType === "Sent" || opType === "Received") {
    return opType;
  }

  let tooltip = "";

  if (opType === "Received (non-sibling to change)") {
    tooltip = `
        <span class="tooltiptext">
            Change address that received funds from an address NOT belonging to the same xpub
        </span>
        `;
  } else if (opType === "Sent to self") {
    tooltip = `
        <span class="tooltiptext">
            Sent to itself (same address)
        </span>
        `;
  } else if (opType === "Sent to sibling") {
    tooltip = `
        <span class="tooltiptext">
            Sent to another address, belonging to the same xpub (sibling)
        </span>
        `;
  } else if (opType === "Failed to send") {
    tooltip = `
        <span class="tooltiptext">
            Send operation failed (it can impact the balance)
        </span>
        `;
  } else if (opType.includes("token")) {
    tooltip = `
        <span class="tooltiptext">
            Ethereum token (e.g. ERC20) related operation
        </span>
        `;
  } else if (opType.includes("dapp")) {
    tooltip = `
        <span class="tooltiptext">
            Ethereum Dapp related operation
        </span>
        `;
  } else if (opType.includes("SCI")) {
    tooltip = `
        <span class="tooltiptext">
            Ethereum smart contract interaction (not a token transfer)
        </span>
        `;
  } else if (opType === "Swapped") {
    tooltip = `
        <span class="tooltiptext">
            Swapped Ethers for tokens (note that it is expected for the imported ETH amount to be positive and for the actual one to be negative)
        </span>
        `;
  } else {
    return opType;
  }

  return '<div class="tooltip">' + opType + tooltip + "</div>";
}

function makeTransactionsTable(outputData: TODO_TypeThis) {
  // balance only mode: do not display the transaction table
  if (outputData.meta.balanceOnly) {
    return "";
  }

  let transactionsTable = `
    <li class="tab">
      <input type="radio" name="tabs" id="tab4" />
      <label for="tab4">Transactions</label>
      <div id="tab-content4" class="content">
      <div class="warning">{warning}</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Block</th>
              <th>Tx id</th>
              <th>Address</th>
              <th>Amount</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {transactions}
          </tbody>
        </table>
      </div>
      </li>
    `;

  // display warning if default provider is being used
  if (outputData.meta.provider === "default") {
    transactionsTable = transactionsTable.replace(
      "{warning}",
      "Default provider used: only the last ~50 operations by address are displayed",
    );
  } else {
    transactionsTable = transactionsTable.replace("{warning}", "");
  }

  const transactions: string[] = [];
  for (const e of outputData.transactions) {
    let rowStyle = "<tr>";

    if (e.operationType === "Failed to send") {
      rowStyle = '<tr class="failed_operation">';
    } else if (
      e.operationType.includes("token") ||
      e.operationType === "Swapped"
    ) {
      rowStyle = '<tr class="token_operation">';
    } else if (e.operationType.includes("SCI")) {
      rowStyle = '<tr class="sci_operation">';
    }

    transactions.push(rowStyle);
    transactions.push("<td>" + e.date + "</td>");
    transactions.push("<td>" + e.block + "</td>");
    transactions.push("<td>" + renderTxid(e.txid) + "</td>");
    transactions.push(
      "<td>" + renderAddress(e.address, e.cashAddress) + "</td>",
    );

    let amount = renderAmount(e.amount);

    if (typeof e.token !== "undefined") {
      amount += renderToken(e.token);
    }

    if (typeof e.dapp !== "undefined") {
      amount += `<br><span class="dapp_details">${e.dapp.contract_name}</span>`;
    }

    transactions.push("<td>" + amount + "</td>");
    transactions.push("<td>" + createTooltip(e.operationType) + "</td></tr>");
  }

  transactionsTable = transactionsTable.replace(
    "{transactions}",
    transactions.join(""),
  );

  return transactionsTable;
}

function makeUTXOSTable(outputData: TODO_TypeThis) {
  if (
    typeof outputData.utxos === "undefined" ||
    outputData.utxos.length === 0
  ) {
    return "";
  }

  const UTXOSTable = `
    <li class="tab">
    <input type="radio" name="tabs" id="tab3" />
    <label for="tab3">UTXOS</label>
    <div id="tab-content3" class="content">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Derivation</th>
            <th>Address</th>
            <th>Balance</th>
            <th>Funded</th>
            <th>Spent</th>
          </tr>
        </thead>
        <tbody>
          {utxos}
        </tbody>
      </table>
    </div>
    </li>
    `;

  const utxos: string[] = [];

  for (const e of outputData.utxos) {
    utxos.push("<tr><td>" + e.derivationMode + "</td>");

    const derivationPath =
      "m/" + e.derivation.account + "/" + e.derivation.index;
    utxos.push("<td>" + derivationPath + "</td>");

    utxos.push("<td>" + renderAddress(e.address, e.cashAddress) + "</td>");

    const balance = renderAmount(e.balance);
    const funded = renderAmount(e.funded);
    const spent = renderAmount(e.spent);

    utxos.push("<td>" + balance + "</td>");
    utxos.push("<td>" + funded + "</td>");
    utxos.push("<td>" + spent + "</td></tr>");
  }

  return UTXOSTable.replace("{utxos}", utxos.join(""));
}

function makeComparisonsTable(outputData: TODO_TypeThis, onlyDiff?: boolean) {
  let comparisonsTemplate = `
    <li class="tab">
    <input type="radio" name="tabs" id="tab{id}" />
    <label for="tab{id}">{label}</label>
    <div id="tab-content{id}" class="content">
    <table>
        <thead>
            <tr style="text-align: center">
                <th rowspan="1" colspan="3" class="right_sep">IMPORTED OPERATION, FROM PRODUCT</th>
                <th rowspan="1" colspan="3" class="right_sep">ACTUAL OPERATION, FROM EXTERNAL PROVIDER</th>
                <th rowspan="2" colspan="1">TXID</th>
                <th rowspan="2" colspan="1">TYPE</th>
                <th rowspan="2" colspan="1">STATUS</th>
            </tr>
            <tr>
                <th>Date</th>
                <th>Address</th>
                <th class="right_sep">Amount</th>
                <th>Date</th>
                <th>Address</th>
                <th class="right_sep">Amount</th>
            </tr>
        </thead>
        <tbody>
            {comparisons}
        </tbody>
    </table>
    </div>
    </li>
    `;

  let comp;

  if (!onlyDiff) {
    comp = outputData.comparisons;
    comparisonsTemplate = comparisonsTemplate.replace(
      "{label}",
      "Comparisons:all",
    );
    comparisonsTemplate = comparisonsTemplate.split("{id}").join("5"); // comparisons:all has id 5
  } else {
    comp = outputData.diffs;
    comparisonsTemplate = comparisonsTemplate.replace(
      "{label}",
      "Comparisons:diff",
    );
    comparisonsTemplate = comparisonsTemplate.split("{id}").join("6"); // comparisons:diff has id 6
  }

  const comparisons: string[] = [];
  if (typeof comp !== "undefined") {
    for (const e of comp) {
      let txid = "";
      let opType = "";

      // by default: no imported operation
      const imported = {
        date: "",
        address: "(no operation)",
        amount: "",
        token: undefined,
        dapp: undefined,
      };

      if (typeof e.imported !== "undefined") {
        imported.date = e.imported.date;
        imported.address = renderAddress(e.imported.address);
        imported.amount = renderAmount(e.imported.amount);
        imported.token = e.imported.token;
        imported.dapp = e.imported.dapp;
        txid = e.imported.txid;
        opType = e.imported.operationType;
      }

      // by default: no actual operation
      const actual = {
        date: "",
        address: "(no operation)",
        amount: "",
        token: undefined,
        dapp: undefined,
      };

      if (typeof e.actual !== "undefined") {
        actual.date = e.actual.date;
        actual.address = renderAddress(e.actual.address, e.actual.cashAddress);
        actual.amount = renderAmount(e.actual.amount);
        actual.token = e.actual.token;
        actual.dapp = e.actual.dapp;
        txid = e.actual.txid;
        opType = e.actual.operationType;
      }

      if (e.status === "Match") {
        if (onlyDiff) {
          continue; // if diff: ignore matches
        }

        if (opType === "Failed to send") {
          comparisons.push('<tr class="failed_operation">');
        } else if (opType.includes("token") || opType === "Swapped") {
          comparisons.push('<tr class="token_operation">');
        } else if (opType.includes("SCI")) {
          comparisons.push('<tr class="sci_operation">');
        } else {
          comparisons.push('<tr class="comparison_match">');
        }
      } else if (e.status.includes("aggregated")) {
        if (onlyDiff) {
          continue; // if diff: ignore aggregated operations
        }
        comparisons.push('<tr class="comparison_aggregated">');
      } else if (e.status === "Skipped") {
        comparisons.push('<tr class="skipped_comparison">');
      } else {
        comparisons.push('<tr class="comparison_mismatch">');
      }

      comparisons.push("<td>" + imported.date + "</td>");
      comparisons.push("<td>" + imported.address + "</td>");

      let importedAmount = imported.amount;

      if (typeof imported.token !== "undefined") {
        importedAmount += renderToken(e.imported.token, e.status);
      }

      if (typeof imported.dapp !== "undefined") {
        importedAmount += `<br><span class="dapp_details">${e.imported.dapp.contract_name}</span>`;
      }

      comparisons.push('<td class="right_sep">' + importedAmount + "</td>");

      comparisons.push("<td>" + actual.date + "</td>");
      comparisons.push("<td>" + actual.address + "</td>");

      let actualAmount = actual.amount;

      if (typeof actual.token !== "undefined") {
        actualAmount += renderToken(actual.token, e.status);
      }

      comparisons.push('<td class="right_sep">' + actualAmount + "</td>");

      comparisons.push("<td>" + renderTxid(txid) + "</td>");
      comparisons.push("<td>" + createTooltip(opType) + "</td>");
      comparisons.push(
        '<td><span class="label ' +
          (e.status.includes("Match")
            ? "match_label"
            : e.status === "Skipped"
            ? "skipped_label"
            : "mismatch_label") +
          '">',
      );
      comparisons.push(
        e.status +
          (e.status === "Skipped"
            ? ` (> block #${configuration.blockHeightUpperLimit})`
            : "") +
          "</span></td></tr>",
      );
    }
  }

  if (comparisons.length > 0) {
    return comparisonsTemplate.replace("{comparisons}", comparisons.join(""));
  } else {
    return "";
  }
}

function saveHTML(outputData: TODO_TypeThis, filepath: string) {
  let report = reportTemplate;

  // meta
  if (typeof outputData.meta.preDerivationSize === "undefined") {
    report = report.replace("{pre_derivation_size}", "");
  } else {
    report = report.replace(
      "{pre_derivation_size}",
      `| pre-derivation size: ${outputData.meta.preDerivationSize}`,
    );
  }

  if (typeof outputData.meta.derivationMode === "undefined") {
    report = report.replace("{derivation_mode}", "");
  } else {
    report = report.replace(
      "{derivation_mode}",
      `| specific derivation mode: ${outputData.meta.derivationMode}`,
    );
  }

  for (const key of Object.keys(outputData.meta)) {
    report = report.split("{" + key + "}").join(outputData.meta[key]);
  }

  // warning range
  if (!outputData.meta.mode.startsWith("Full")) {
    report = report.replace(
      "{warning_range}",
      `<div id='warning_range'>The data is based on a partial scan:<br/> ${outputData.meta.mode}</div>`,
    );
  } else {
    report = report.replace("{warning_range}", "");
  }

  // summary
  const summary: string[] = [];
  for (const e of outputData.summary) {
    if (typeof e.derivationMode !== "undefined") {
      summary.push("<tr><td>" + e.derivationMode + "</td>");
    } else {
      summary.push("<tr><td>" + configuration.currency.name + "</td>");
    }

    const balance = toAccountUnit(new BigNumber(e.balance));

    if (balance === "0") {
      summary.push('<td class="summary_empty">');
    } else {
      summary.push('<td class="summary_non_empty">');
    }

    summary.push(balance + "</td></tr>");
  }

  report = report.replace("{summary}", summary.join(""));

  // addresses
  const addresses: string[] = [];

  for (const e of outputData.addresses) {
    if (typeof e.derivation.account !== "undefined") {
      addresses.push("<tr><td>" + e.derivationMode + "</td>");
      const derivationPath =
        "m/" + e.derivation.account + "/" + e.derivation.index;
      addresses.push("<td>" + derivationPath + "</td>");
    } else {
      addresses.push(
        "<tr><td>" + configuration.currency.name + "</td><td>-</td>",
      );
    }

    addresses.push("<td>" + renderAddress(e.address, e.cashAddress) + "</td>");

    const balance = renderAmount(e.balance);
    const funded = renderAmount(e.funded);
    const spent = renderAmount(e.spent);

    addresses.push("<td>" + balance + "</td>");
    addresses.push("<td>" + funded + "</td>");
    addresses.push("<td>" + spent + "</td></tr>");
  }

  report = report.replace("{addresses}", addresses.join(""));

  // UTXOs
  report = report.replace("{utxos_table}", makeUTXOSTable(outputData));

  // transactions
  report = report.replace(
    "{transactions_table}",
    makeTransactionsTable(outputData),
  );

  // comparisons and diff
  if (
    typeof outputData.comparisons === "undefined" ||
    outputData.comparisons.length === 0
  ) {
    report = report.replace("{comparisons_table}", "");
    report = report.replace("{diff_table}", "");
  } else {
    report = report.replace(
      "{comparisons_table}",
      makeComparisonsTable(outputData),
    );
    report = report.replace(
      "{diff_table}",
      makeComparisonsTable(outputData, true),
    );
  }

  filepath += ".html";

  const minifiedReport = minifier.minify(report, {
    removeAttributeQuotes: true,
    minifyCSS: true,
    removeComments: true,
    useShortDoctype: true,
    removeRedundantAttributes: true,
    removeOptionalTags: true,
    removeEmptyAttributes: true,
    removeEmptyElements: false, // do NOT remove empty elements (e.g., empty addresses)
  });

  fs.writeFileSync(filepath, minifiedReport);

  console.log("\nHTML report saved: ".concat(filepath));
}

function saveJSON(outputData: TODO_TypeThis, filepath: string) {
  const JSONobject = JSON.stringify(outputData, null, 2);

  if (filepath.toLocaleLowerCase() === "stdout") {
    // display
    console.log(JSONobject);
  } else {
    // save file
    filepath += ".json";

    fs.writeFileSync(filepath, JSONobject);

    console.log("\nJSON export saved: ".concat(filepath));
  }
}

function save(meta: TODO_TypeThis, data: TODO_TypeThis, directory: string) {
  const balanceOnly = meta.balanceOnly;

  // convert amounts into base unit
  const addresses: TODO_TypeThis[] = data.addresses.map((e: TODO_TypeThis) => {
    return {
      derivationMode: e.derivationMode,
      derivation: e.getDerivation(),
      address: e.toString(),
      cashAddress: e.asCashAddress(),
      balance: toBaseUnit(e.balance),
      funded: toBaseUnit(e.stats.funded),
      spent: toBaseUnit(e.stats.spent),
    };
  });

  let utxos: TODO_TypeThis[] = [];

  if (configuration.currency.utxo_based) {
    utxos = data.addresses
      .filter((a: Address) => a.isUTXO())
      .map((e: TODO_TypeThis) => {
        return {
          derivationMode: e.derivationMode,
          derivation: e.getDerivation(),
          address: e.toString(),
          cashAddress: e.asCashAddress(),
          balance: toBaseUnit(e.balance),
          funded: toBaseUnit(e.stats.funded),
          spent: toBaseUnit(e.stats.spent),
          // balance only mode: ignore the following fields
          txid: balanceOnly ? undefined : e.transactions[0].txid,
          height: balanceOnly ? undefined : e.transactions[0].blockHeight,
          time: balanceOnly ? undefined : e.transactions[0].date,
        };
      });
  }

  const summary: TODO_TypeThis[] = data.summary.map((e: TODO_TypeThis) => {
    return {
      ...e,
      balance: toBaseUnit(new BigNumber(e.balance)),
    };
  });

  const transactions: TODO_TypeThis[] = !balanceOnly
    ? data.transactions.map((e: TODO_TypeThis) => {
        return {
          ...e,
          cashAddress: toUnprefixedCashAddress(e.address),
          amount: toBaseUnit(e.amount),
        };
      })
    : [];

  const comparisons: TODO_TypeThis[] =
    typeof data.comparisons !== "undefined"
      ? data.comparisons.map((e: TODO_TypeThis) => {
          return {
            ...e,
            imported:
              typeof e.imported !== "undefined"
                ? {
                    ...e.imported,
                    amount: toBaseUnit(e.imported.amount),
                  }
                : undefined,
            actual:
              typeof e.actual !== "undefined"
                ? {
                    ...e.actual,
                    cashAddress: toUnprefixedCashAddress(e.actual.address),
                    amount: toBaseUnit(e.actual.amount),
                  }
                : undefined,
          };
        })
      : undefined;

  let diffs = [];

  if (typeof comparisons !== "undefined") {
    diffs =
      comparisons.filter(
        (comparison) =>
          !comparison.status.startsWith("Match") &&
          comparison.status !== "Skipped",
      ) || [];
  }

  let warningRange;
  if (!meta.mode.startsWith("Full")) {
    warningRange = `! The data is based on a partial scan: ${meta.mode} !`;
  }

  const outputData = {
    meta: {
      by: "xpub scan <https://github.com/LedgerHQ/xpub-scan>",
      version: meta.version,
      xpub: meta.xpub,
      analysis_date: meta.date,
      currency: configuration.currency.name.concat(
        configuration.testnet ? " (testnet)" : " (mainnet)",
      ),
      provider: configuration.providerType,
      provider_url: configuration.externalProviderURL,
      gap_limit: configuration.gap_limit,
      unit: "Base unit (i.e., satoshis or equivalent unit)",
      mode: meta.mode,
      preDerivationSize: meta.preDerivationSize,
      derivationMode: meta.derivationMode,
      warningRange,
      balanceOnly,
    },
    addresses,
    utxos,
    summary,
    transactions: balanceOnly ? undefined : transactions, // ignore in balance only mode
    comparisons,
    diffs: balanceOnly ? undefined : diffs, // ignore in balance only mode
  };

  // if no filepath/filename specify -> set to current directory
  if (directory === "") {
    directory = __dirname;
  }

  let filepath = directory;
  if (filepath.toLocaleLowerCase() !== "stdout") {
    filepath += `/${meta.xpub}`;
    saveHTML(outputData, filepath); // do not save HTML if stdout
  }

  saveJSON(outputData, filepath);

  // add empty line to separate this text block from potential check results
  console.log();
}

export { save };
