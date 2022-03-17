import fs from "fs";
import minifier from "html-minifier";

import {
  configuration,
  EXTERNAL_EXPLORERS_URLS,
} from "../configuration/settings";
import { reportTemplate } from "../templates/report.html";
import { base64WhiteLogo, base64YellowLogo } from "../templates/logos.base64";
import { toAccountUnit, toBaseUnit, toUnprefixedCashAddress } from "../helpers";
import { Address } from "../models/address";
import { Summary, TODO_TypeThis } from "../types";
import { currencies } from "../configuration/currencies";
import BigNumber from "bignumber.js";
import { ComparisonStatus, Comparison } from "../models/comparison";
import { Operation } from "../models/operation";

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
    renderedAmount = "0".padEnd(decimalPrecision, filler);
  } else {
    renderedAmount = toAccountUnit(n, 8);
  }

  // align any number: insert filler on the left
  renderedAmount = renderedAmount.padStart(decimalPrecision, filler);

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

    if (configuration.testnet) {
      // https://etherscan.io -> https://ropsten.etherscan.io
      url = url.replace("https://", "https://ropsten.");
    }
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

  const transactionsTableHead = `
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
  `;

  let transactionsTemplate = `
    {paginationStyle}
    <li class="tab">
      <input type="radio" name="tabs" id="tab4" />
      <label for="tab4">${outputData.transactions.length} Transactions</label>
      <div id="tab-content4" class="content">
      <div class="warning">{warning}</div>
        {paginationRadios}
        {transactions}
        {paginationSlider}
      </div>
    </li>
  `;

  // display warning if default provider is being used
  if (outputData.meta.provider === "default") {
    transactionsTemplate = transactionsTemplate.replace(
      "{warning}",
      "Default provider used: only the last ~50 operations by address are displayed",
    );
  } else {
    transactionsTemplate = transactionsTemplate.replace("{warning}", "");
  }

  const transactions: string[][] = [];
  for (const e of outputData.transactions) {
    let rowStyle = "<tr>";
    const transactionRow: string[] = [];

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

    transactionRow.push(rowStyle);
    transactionRow.push("<td>" + e.date + "</td>");
    transactionRow.push("<td>" + e.block + "</td>");
    transactionRow.push("<td>" + renderTxid(e.txid) + "</td>");
    transactionRow.push(
      "<td>" + renderAddress(e.address, e.cashAddress) + "</td>",
    );

    let amount = renderAmount(e.amount);

    if (typeof e.token !== "undefined") {
      amount += renderToken(e.token);
    }

    if (typeof e.dapp !== "undefined") {
      amount += `<br><span class="dapp_details">${e.dapp.contract_name}</span>`;
    }

    transactionRow.push("<td>" + amount + "</td>");
    transactionRow.push("<td>" + createTooltip(e.operationType) + "</td></tr>");
    transactions.push(transactionRow);
  }

  return makePaginatedTable(
    transactionsTableHead,
    transactionsTemplate,
    transactions,
    100,
    "transactions",
  );
}

function makeUTXOSTable(outputData: TODO_TypeThis) {
  if (
    typeof outputData.utxos === "undefined" ||
    outputData.utxos.length === 0
  ) {
    return "";
  }

  const UTXOSTableHead = `
    <thead>
      <tr>
        <th>Type</th>
        <th>Derivation</th>
        <th>Address</th>
        <th>Balance</th>
        <th>Funded</th>
        <th>Spent</th>
      </tr>
    </thead>`;

  const UTXOSTemplate = `
    {paginationStyle}
    <li class="tab">
      <input type="radio" name="tabs" id="tab3" />
      <label for="tab3">${outputData.utxos.length} UTXO${
    outputData.utxos.length > 1 ? "S" : ""
  }</label>
      <div id="tab-content3" class="content">
        {paginationRadios}
        {utxos}
        {paginationSlider}
      </div>
    </li>
    `;

  const utxos: string[][] = [];

  for (const e of outputData.utxos) {
    const utxoRow: string[] = [];
    utxoRow.push("<tr><td>" + e.derivationMode + "</td>");

    const derivationPath =
      "m/" + e.derivation.account + "/" + e.derivation.index;
    utxoRow.push("<td>" + derivationPath + "</td>");

    utxoRow.push("<td>" + renderAddress(e.address, e.cashAddress) + "</td>");

    const balance = renderAmount(e.balance);
    const funded = renderAmount(e.funded);
    const spent = renderAmount(e.spent);

    utxoRow.push("<td>" + balance + "</td>");
    utxoRow.push("<td>" + funded + "</td>");
    utxoRow.push("<td>" + spent + "</td></tr>");
    utxos.push(utxoRow);
  }

  return makePaginatedTable(UTXOSTableHead, UTXOSTemplate, utxos, 100, "utxos");
}

function makeComparisonsTable(outputData: TODO_TypeThis, onlyDiff?: boolean) {
  const comparisonsTableHead = `
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
  `;

  let comparisonsTemplate = `
    {paginationStyle}
    <li class="tab">
      <input type="radio" name="tabs" id="tab{id}" />
      <label for="tab{id}">${
        onlyDiff ? outputData.diffs.length : outputData.comparisons.length
      } {label}</label>
      <div id="tab-content{id}" class="content">
        {paginationRadios}
        ${onlyDiff ? "{diffs}" : "{comparisons}"}
        {paginationSlider}
      </div>
    </li>
    `;

  let comp;

  if (!onlyDiff) {
    comp = outputData.comparisons;
    comparisonsTemplate = comparisonsTemplate.replace(
      "{label}",
      `Comparison${outputData.comparisons.length > 1 ? "s" : ""}`,
    );
    comparisonsTemplate = comparisonsTemplate.split("{id}").join("5"); // comparisons have id 5
  } else {
    comp = outputData.diffs;
    comparisonsTemplate = comparisonsTemplate.replace(
      "{label}",
      `Difference${outputData.diffs.length > 1 ? "s" : ""}`,
    );
    comparisonsTemplate = comparisonsTemplate.split("{id}").join("6"); // differences have id 6
  }

  const comparisons: string[][] = [];
  if (typeof comp !== "undefined") {
    for (const e of comp) {
      const comparisonRow: string[] = [];
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
          comparisonRow.push('<tr class="failed_operation">');
        } else if (opType.includes("token") || opType === "Swapped") {
          comparisonRow.push('<tr class="token_operation">');
        } else if (opType.includes("SCI")) {
          comparisonRow.push('<tr class="sci_operation">');
        } else {
          comparisonRow.push('<tr class="comparison_match">');
        }
      } else if (e.status.includes("aggregated")) {
        if (onlyDiff) {
          continue; // if diff: ignore aggregated operations
        }
        comparisonRow.push('<tr class="comparison_aggregated">');
      } else if (e.status === "Skipped") {
        comparisonRow.push('<tr class="skipped_comparison">');
      } else {
        comparisonRow.push('<tr class="comparison_mismatch">');
      }

      comparisonRow.push("<td>" + imported.date + "</td>");
      comparisonRow.push("<td>" + imported.address + "</td>");

      let importedAmount = imported.amount;

      if (typeof imported.token !== "undefined") {
        importedAmount += renderToken(e.imported.token, e.status);
      }

      if (typeof imported.dapp !== "undefined") {
        importedAmount += `<br><span class="dapp_details">${e.imported.dapp.contract_name}</span>`;
      }

      comparisonRow.push('<td class="right_sep">' + importedAmount + "</td>");

      comparisonRow.push("<td>" + actual.date + "</td>");
      comparisonRow.push("<td>" + actual.address + "</td>");

      let actualAmount = actual.amount;

      if (typeof actual.token !== "undefined") {
        actualAmount += renderToken(actual.token, e.status);
      }

      comparisonRow.push('<td class="right_sep">' + actualAmount + "</td>");

      comparisonRow.push("<td>" + renderTxid(txid) + "</td>");
      comparisonRow.push("<td>" + createTooltip(opType) + "</td>");
      comparisonRow.push(
        '<td><span class="label ' +
          (e.status.includes("Match")
            ? "match_label"
            : e.status === "Skipped"
            ? "skipped_label"
            : "mismatch_label") +
          '">',
      );
      comparisonRow.push(
        e.status +
          (e.status === "Skipped"
            ? ` (> block #${configuration.blockHeightUpperLimit})`
            : "") +
          "</span></td></tr>",
      );
      comparisons.push(comparisonRow);
    }
  }

  if (comparisons.length > 0) {
    return makePaginatedTable(
      comparisonsTableHead,
      comparisonsTemplate,
      comparisons,
      100,
      onlyDiff ? "diffs" : "comparisons",
    );
  } else {
    return "";
  }
}

function makePaginatedTable(
  tableHead: string,
  template: string,
  rowsData: string[][],
  pageSize: number,
  key: string,
) {
  if (rowsData.length > pageSize) {
    const pageCount = Math.ceil(rowsData.length / 100);
    const pageArray = [...Array(pageCount).keys()].map((i) => i + 1);
    template = template
      .replace(
        "{paginationStyle}",
        `<style type="text/css">
          ${pageArray.map((i) => `#${key}-radio${i}`).join(", ")} {
            display: none;
          }
          .page-slider {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            max-width: 1000px;
            margin: auto;
            text-align: center;
          }
          .${key}-page-label {
            cursor: pointer;
            color: white;
            background-color: #303030;
            padding: 6px;
            width: 50px;
            margin: 0px;
          }
          ${pageArray.map((i) => `#${key}-page${i}`).join(", ")} {
            display: none;
          }
          ${pageArray
            .map(
              (i) =>
                `#${key}-radio${i}:checked ~ .page-slider #${key}-label${i}`,
            )
            .join(", ")} {
            background-color: #4a83fd;
          }
          ${pageArray
            .map((i) => `#${key}-radio${i}:checked ~ #${key}-page${i}`)
            .join(", ")} {
            display: table;
          }
        </style>`,
      )
      .replace(
        "{paginationRadios}",
        pageArray
          .map(
            (i) =>
              `<input type="radio" name="${key}-page-radio" id="${key}-radio${i}" ${
                i === 1 ? "checked" : ""
              } />`,
          )
          .join(""),
      )
      .replace(
        "{paginationSlider}",
        `<div class="page-slider">
          ${pageArray
            .map(
              (i) =>
                `<label for="${key}-radio${i}" id="${key}-label${i}" class="${key}-page-label">
                  ${i}
                </label>`,
            )
            .join("")}
        </div>`,
      )
      .replace(
        `{${key}}`,
        pageArray
          .map(
            (i) =>
              `<table id="${key}-page${i}">
                ${tableHead}
                <tbody>
                  ${rowsData
                    .slice(i * 100 - 100, i * 100)
                    .map((rowData) => rowData.join(""))
                    .join("")}
                </tbody>
              </table>`,
          )
          .join(""),
      );
  } else {
    template = template
      .replace("{paginationStyle}", "")
      .replace("{paginationRadios}", "")
      .replace("{paginationSlider}", "")
      .replace(
        `{${key}}`,
        `<table>
          ${tableHead}
          <tbody>
            ${rowsData.map((rowData) => rowData.join("")).join("")}
          </tbody>
        </table>`,
      );
  }
  return template;
}

function makeAddressesTable(outputData: TODO_TypeThis) {
  const addressesTableHead = `
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
  `;

  let addressesTemplate = `
    {paginationStyle}
    <li class="tab">
      <input type="radio" name="tabs" id="tab2" />
      <label for="tab2">{addresses_count} Address{addresses_plural}</label>
      <div id="tab-content2" class="content">
        {paginationRadios}
        {addresses}
        {paginationSlider}
      </div>
    </li>`;

  const addresses: string[][] = [];

  for (const e of outputData.addresses) {
    const addressRow: string[] = [];

    if (typeof e.derivation.account !== "undefined") {
      addressRow.push("<tr><td>" + e.derivationMode + "</td>");
      const derivationPath =
        "m/" + e.derivation.account + "/" + e.derivation.index;
      addressRow.push("<td>" + derivationPath + "</td>");
    } else {
      addressRow.push(
        "<tr><td>" + configuration.currency.name + "</td><td>-</td>",
      );
    }

    addressRow.push("<td>" + renderAddress(e.address, e.cashAddress) + "</td>");

    const balance = renderAmount(e.balance);
    const funded = renderAmount(e.funded);
    const spent = renderAmount(e.spent);

    addressRow.push("<td>" + balance + "</td>");
    addressRow.push("<td>" + funded + "</td>");
    addressRow.push("<td>" + spent + "</td></tr>");
    addresses.push(addressRow);
  }

  addressesTemplate = addressesTemplate.replace(
    "{addresses_count}",
    outputData.addresses.length.toFixed(),
  );
  addressesTemplate = addressesTemplate.replace(
    "{addresses_plural}",
    outputData.addresses.length > 1 ? "es" : "",
  );

  return makePaginatedTable(
    addressesTableHead,
    addressesTemplate,
    addresses,
    100,
    "addresses",
  );
}

function saveHTML(outputData: TODO_TypeThis, filepath: string) {
  let report = reportTemplate;

  // background color and logo
  if (configuration.testnet) {
    // yellow if testnet
    report = report.replace("{body_background_color}", "#f7f48a");
    report = report.replace("{logo_base_64}", base64YellowLogo);
  } else {
    // white otherwise
    report = report.replace("{body_background_color}", "#ffffff");
    report = report.replace("{logo_base_64}", base64WhiteLogo);
  }

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
  report = report.replace("{addresses_table}", makeAddressesTable(outputData));

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
  // stringify -> parse -> stringify to remove `undefined` in final JSON
  const JSONobject = JSON.stringify(
    JSON.parse(JSON.stringify(outputData)),
    null,
    2,
  );

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
  const addresses: Address[] = data.addresses.map((e: Address) => {
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

  let utxos: Address[] = [];

  if (configuration.currency.utxo_based) {
    utxos = data.addresses
      .filter((a: Address) => a.isUTXO())
      .map((e: Address) => {
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

  const summary: Summary[] = data.summary.map((e: Summary) => {
    return {
      ...e,
      balance: toBaseUnit(new BigNumber(e.balance)),
    };
  });

  const transactions: Operation[] = !balanceOnly
    ? data.transactions.map((e: Operation) => {
        return {
          ...e,
          cashAddress: toUnprefixedCashAddress(e.address),
          amount: toBaseUnit(e.amount),
        };
      })
    : [];

  const comparisons: Comparison[] =
    typeof data.comparisons !== "undefined"
      ? data.comparisons.map((e: Comparison) => {
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

  let diffs: Comparison[] = [];

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

  const providerUrl = configuration.externalProviderURL.split("/");
  const providerBaseUrl = providerUrl[0] + "//" + providerUrl[2];

  const outputData = {
    meta: {
      by: "xpub scan <https://github.com/LedgerHQ/xpub-scan>",
      version: meta.version,
      xpub: meta.xpub,
      analysis_date: meta.date,
      currency: configuration.currency.name.concat(
        configuration.testnet
          ? configuration.currency.symbol === currencies.eth.symbol &&
            typeof configuration.APIKey !== "undefined"
            ? " (ropsten)"
            : " (testnet)"
          : " (mainnet)",
      ),
      provider: configuration.providerType,
      provider_url: providerBaseUrl,
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
