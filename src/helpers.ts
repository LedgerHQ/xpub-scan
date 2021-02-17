// @ts-ignore
import request from "sync-request";

import * as bip32 from 'bip32';
import chalk from "chalk";

import { BITCOIN_NETWORK, LITECOIN_NETWORK, network } from "./settings";
import { transientLine } from "./display";

// TODO: rework this function
function getJSON(url: string, attempts = 0) {
  const res = request('GET', url);

  if (attempts > 5) {
    console.log(chalk.red('GET request error'));
    throw new Error(
      "GET REQUEST ERROR: "
        .concat(url)
        .concat(", Status Code: ")
        .concat(String(res.statusCode))
      );
  }

  if (res.statusCode !== 200) {
    transientLine(chalk.red('GET request error'));
    attempts++;
    getJSON(url, attempts);
  }

  return JSON.parse(res.getBody('utf-8'));
}

// ensure that the xpub is a valid one
// and select the relevant network
function checkXpub(xpub: string) {
  const prefix = xpub.substring(0, 4);

  if (prefix === 'xpub') {
    network.type = BITCOIN_NETWORK;
  }
  else if (prefix === 'Ltub') {
    network.type = LITECOIN_NETWORK;
  }
  else {
    throw new Error("INVALID XPUB: " + xpub + " has not a valid prefix");
  }

  try {
    bip32.fromBase58(xpub, network.type);
  }
  catch (e) {
    throw new Error("INVALID XPUB: " + xpub + " is not a valid xpub -- " + e);
  }
}

export {
  checkXpub,
  getJSON
}