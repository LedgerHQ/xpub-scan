import fs from "fs";
import sb from "satoshi-bitcoin";
import minifier from "html-minifier";

import {
  configuration,
  GAP_LIMIT,
  EXTERNAL_EXPLORERS_URLS,
} from "../configuration/settings";
import { reportTemplate } from "../templates/report.html";
import { toUnprefixedCashAddress } from "../helpers";
import { Address } from "../models/address";
import { TODO_TypeThis } from "../types";

function toBaseUnit(amount: number) {
  // to bitcoins (or equivalent unit)
  let n = sb.toSatoshi(amount);

  // if is float, truncate (no float expected)
  // (this kind of issue can happen with imported operations
  //  and does not affect the comparison itself)
  if (n % 1 !== 0) {
    n = Math.trunc(n);
  }

  return String(n);
}

// align float numbers or zeros
function renderAmount(amount: number) {
  const decimalPrecision = 8;
  const filler = "¤"; // (any non-numeric non-dot char)
  let n;

  // non-strict equality required here
  // tslint:disable-next-line
  if (amount == 0) {
    // align '0': insert filler on the right
    n = "0".padEnd(decimalPrecision + 2, filler);
  } else {
    n = sb.toBitcoin(amount).toFixed(decimalPrecision);
  }

  // align any number: insert filler on the left
  n = String(n).padStart(decimalPrecision * 2, filler);

  // insert non-breaking spaces by replacing the filler with `&nbsp;`
  return (
    '<span class="monospaced">' + n.split(filler).join("&nbsp;") + "</span>"
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

  // Bitcoin Cash
  //
  // coin:        "bitcoin-cash"
  // item types:  "address" | "transaction"
  if (configuration.symbol === "BCH") {
    url = EXTERNAL_EXPLORERS_URLS.bch;
    url = url.replace("{coin}", "bitcoin-cash");
    itemTypes.transaction = "transaction";
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
    .replace("{coin}", configuration.symbol.toLowerCase())
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

  if (configuration.symbol !== "BCH" || !cashAddress) {
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
  }

  return '<div class="tooltip">' + opType + tooltip + "</div>";
}

function makeUTXOSTable(object: TODO_TypeThis) {
  if (typeof object.utxos === "undefined" || object.utxos.length === 0) {
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

  for (const e of object.utxos) {
    utxos.push("<tr><td>" + e.addressType + "</td>");

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

function makeComparisonsTable(object: TODO_TypeThis, onlyDiff?: boolean) {
  let comparisonsTemplate = `
    <li class="tab">
    <input type="radio" name="tabs" id="tab{id}" />
    <label for="tab{id}">{label}</label>
    <div id="tab-content{id}" class="content">
    <table>
        <thead>
            <tr style="text-align: center">
                <th rowspan="1" colspan="3">Imported</th>
                <th rowspan="1" colspan="3">Actual</th>
                <th rowspan="2" colspan="1">TXID</th>
                <th rowspan="2" colspan="1">Type</th>
                <th rowspan="2" colspan="1">Status</th>
            </tr>
            <tr>
                <th>Date</th>
                <th>Address</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Address</th>
                <th>Amount</th>
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
    comp = object.comparisons;
    comparisonsTemplate = comparisonsTemplate.replace(
      "{label}",
      "Comparisons:all",
    );
    comparisonsTemplate = comparisonsTemplate.split("{id}").join("5"); // comparisons:all has id 5
  } else {
    comp = object.diffs;
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
      const imported = { date: "", address: "(no operation)", amount: "" };

      if (typeof e.imported !== "undefined") {
        imported.date = e.imported.date;
        imported.address = renderAddress(e.imported.address);
        imported.amount = renderAmount(e.imported.amount);
        txid = e.imported.txid;
        opType = e.imported.operationType;
      }

      // by default: no actual operation
      const actual = { date: "", address: "(no operation)", amount: "" };

      if (typeof e.actual !== "undefined") {
        actual.date = e.actual.date;
        actual.address = renderAddress(e.actual.address, e.actual.cashAddress);
        actual.amount = renderAmount(e.actual.amount);
        txid = e.actual.txid;
        opType = e.actual.operationType;
      }

      if (e.status === "Match") {
        if (onlyDiff) {
          continue; // if diff: ignore matches
        }
        comparisons.push('<tr class="comparison_match">');
      } else {
        comparisons.push('<tr class="comparison_mismatch">');
      }

      comparisons.push("<td>" + imported.date + "</td>");
      comparisons.push("<td>" + imported.address + "</td>");
      comparisons.push("<td>" + imported.amount + "</td>");
      comparisons.push("<td>" + actual.date + "</td>");
      comparisons.push("<td>" + actual.address + "</td>");
      comparisons.push("<td>" + actual.amount + "</td>");
      comparisons.push("<td>" + renderTxid(txid) + "</td>");
      comparisons.push("<td>" + createTooltip(opType) + "</td>");
      comparisons.push("<td>" + e.status + "</td></tr>");
    }
  }

  if (comparisons.length > 0) {
    return comparisonsTemplate.replace("{comparisons}", comparisons.join(""));
  } else {
    return "";
  }
}

function saveHTML(object: TODO_TypeThis, filepath: string) {
  let report = reportTemplate;

  // meta
  for (const key of Object.keys(object.meta)) {
    report = report.split("{" + key + "}").join(object.meta[key]);
  }

  // summary
  const summary: string[] = [];
  for (const e of object.summary) {
    summary.push("<tr><td>" + e.addressType + "</td>");

    const balance = sb.toBitcoin(e.balance);

    // non-strict equality required here
    if (balance === 0) {
      summary.push('<td class="summary_empty">');
    } else {
      summary.push('<td class="summary_non_empty">');
    }

    summary.push(balance + "</td></tr>");
  }

  report = report.replace("{summary}", summary.join(""));

  // addresses
  const addresses: string[] = [];

  for (const e of object.addresses) {
    addresses.push("<tr><td>" + e.addressType + "</td>");

    const derivationPath =
      "m/" + e.derivation.account + "/" + e.derivation.index;
    addresses.push("<td>" + derivationPath + "</td>");

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
  report = report.replace("{utxos}", makeUTXOSTable(object));

  // transactions

  // display warning if default provider is being used
  if (object.meta.provider === "default") {
    report = report.replace(
      "{warning}",
      "Default provider used: only the last ~50 operations by address are displayed",
    );
  } else {
    report = report.replace("{warning}", "");
  }

  const transactions: string[] = [];
  for (const e of object.transactions) {
    transactions.push("<tr><td>" + e.date + "</td>");
    transactions.push("<td>" + e.block + "</td>");
    transactions.push("<td>" + renderTxid(e.txid) + "</td>");
    transactions.push(
      "<td>" + renderAddress(e.address, e.cashAddress) + "</td>",
    );
    transactions.push("<td>" + renderAmount(e.amount) + "</td>");
    transactions.push("<td>" + createTooltip(e.operationType) + "</td></tr>");
  }

  report = report.replace("{transactions}", transactions.join(""));

  // comparisons and diff
  if (
    typeof object.comparisons === "undefined" ||
    object.comparisons.length === 0
  ) {
    report = report.replace("{comparisons}", "");
    report = report.replace("{diff}", "");
  } else {
    report = report.replace("{comparisons}", makeComparisonsTable(object));
    report = report.replace("{diff}", makeComparisonsTable(object, true));
  }

  filepath += ".html";

  const minifiedReport = minifier.minify(report, {
    removeAttributeQuotes: true,
    minifyCSS: true,
    removeComments: true,
  });

  fs.writeFileSync(filepath, minifiedReport);

  console.log("HTML report saved: ".concat(filepath));
}

function saveJSON(object: TODO_TypeThis, filepath: string) {
  const JSONobject = JSON.stringify(object, null, 2);

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
  // convert amounts into base unit
  const addresses: TODO_TypeThis[] = data.addresses.map((e: TODO_TypeThis) => {
    return {
      addressType: e.addressType,
      derivation: e.getDerivation(),
      address: e.toString(),
      cashAddress: e.asCashAddress(),
      balance: toBaseUnit(e.balance),
      funded: toBaseUnit(e.stats.funded),
      spent: toBaseUnit(e.stats.spent),
    };
  });

  const utxos: TODO_TypeThis[] = data.addresses
    .filter((a: Address) => a.isUTXO())
    .map((e: TODO_TypeThis) => {
      return {
        addressType: e.addressType,
        derivation: e.getDerivation(),
        address: e.toString(),
        cashAddress: e.asCashAddress(),
        balance: toBaseUnit(e.balance),
        funded: toBaseUnit(e.stats.funded),
        spent: toBaseUnit(e.stats.spent),
        txid: e.transactions[0].txid,
        height: e.transactions[0].blockHeight,
        time: e.transactions[0].date,
      };
    });

  const summary: TODO_TypeThis[] = data.summary.map((e: TODO_TypeThis) => {
    return {
      ...e,
      balance: toBaseUnit(e.balance),
    };
  });

  const transactions: TODO_TypeThis[] = data.transactions.map(
    (e: TODO_TypeThis) => {
      return {
        ...e,
        cashAddress: toUnprefixedCashAddress(e.address),
        amount: toBaseUnit(e.amount),
      };
    },
  );

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

  let providerURL;
  if (typeof configuration.customAPI !== "undefined") {
    providerURL = configuration.customAPI;
  } else if (configuration.symbol === "BCH") {
    providerURL = configuration.defaultAPI.bch;
  } else {
    providerURL = configuration.defaultAPI.general;
  }

  let diffs = [];

  if (typeof comparisons !== "undefined") {
    diffs =
      comparisons.filter((comparison) => comparison.status !== "Match") || [];
  }

  const object = {
    meta: {
      by: "xpub scan <https://github.com/LedgerHQ/xpub-scan>",
      version: meta.version,
      xpub: meta.xpub,
      analysis_date: meta.date,
      currency: configuration.currency,
      provider: configuration.providerType,
      provider_url: providerURL,
      gap_limit: GAP_LIMIT,
      unit: "Base unit (i.e., satoshis or equivalent unit)",
      mode: meta.mode,
    },
    addresses,
    utxos,
    summary,
    transactions,
    comparisons,
    diffs,
  };

  // if no filepath/filename specify -> set to current directory
  if (directory === "") {
    directory = __dirname;
  }

  let filepath = directory;
  if (filepath.toLocaleLowerCase() !== "stdout") {
    filepath += `/${meta.xpub}`;

    if (meta.mode !== "Full") {
      // use derivation path as filename postfix: `m/x/y` => `-x-y`
      // (+TODO: range mode)
      filepath += meta.mode.replace("m", "").replace(/\//gi, "-");
    }

    saveHTML(object, filepath); // do not save HTML if stdout
  }

  saveJSON(object, filepath);

  // add empty line to separate this text block from potential check results
  console.log();
}

export { save };
