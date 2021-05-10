import yargs from "yargs";
import { checkArgs } from "./check";

import { TODO_TypeThis } from "../types";

/**
 * Returns the valid args entered by the user
 * @returns any
 *          The validated args
 */
export const getArgs = (): TODO_TypeThis => {
  const args = yargs
    // primary options
    .option("currency", {
      description: "currency",
      demand: false,
      type: "string",
    })
    .option("testnet", {
      description: "testnet",
      demand: false,
      type: "boolean",
      default: false,
    })
    .option("account", {
      alias: "a",
      description: "Account number",
      demand: false,
      type: "number",
    })
    .option("index", {
      alias: "i",
      description: "Index number",
      demand: false,
      type: "number",
    })
    .option("from-index", {
      description: "ScanLimits: FROM index X",
      demand: false,
      type: "number",
    })
    .option("to-index", {
      description: "ScanLimits: TO index Y",
      demand: false,
      type: "number",
    })
    .option("pre-derivation-size", {
      description: "ScanLimits: number of pre-derived addresses per account",
      demand: false,
      type: "number",
    })
    .option("address", {
      description: "Address",
      demand: false,
      type: "string",
    })
    // stdout options
    .option("silent", {
      description:
        "Do not display anything (except for the filepath of the saved reports)",
      demand: false,
      type: "boolean",
      default: false,
    })
    .option("quiet", {
      description: "Do not display analysis progress",
      demand: false,
      type: "boolean",
      default: false,
    })
    .option("diff", {
      description: "Show diffs",
      demand: false,
      type: "boolean",
    })
    // imported data
    .option("import", {
      description: "[DEPRECATED] Import operations (file) for comparison",
      demand: false,
      type: "string",
    })
    .option("addresses", {
      description: "Import addresses (file) for comparison",
      demand: false,
      type: "string",
    })
    .option("balance", {
      description:
        "Import balance for comparison (has to be in satoshis or similar base unit) for comparison",
      demand: false,
      type: "number",
    })
    .option("utxos", {
      description: "Import UTXOs (file) for comparison",
      demand: false,
      type: "string",
    })
    .option("operations", {
      description: "Import operations history (file) for comparison",
      demand: false,
      type: "string",
    })
    // save
    .option("save", {
      description: "Save analysis",
      demand: false,
      type: "string",
    }).argv;

  checkArgs(args);

  return args;
};
