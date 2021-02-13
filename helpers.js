const request = require('sync-request');
const bip32 = require('bip32');
const chalk = require('chalk');
const Promise = require('es6-promise').Promise;

const { BITCOIN_NETWORK, LITECOIN_NETWORK } = require('./settings');
const { transientLine } = require('./display');

function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

// TODO: rework this function
function getJSON(url, attempts = 0) {
  
  if (attempts > 5) {
    console.log(chalk.red('GET request error'));
    throw new Error(
      "GET REQUEST ERROR: "
        .concat(url)
        .concat(", Status Code: ")
        .concat(res.statusCode)
      );
  }

  const res = request('GET', url);
  
  if (res.statusCode != 200) {
    transientLine(chalk.red('GET request error'));
    attempts++;
    sleep(1000).then(() => {
      getJSON(url, attempts);
    });
  }
  
  return JSON.parse(res.getBody('utf-8'));
}

// ensure that the xpub is a valid one
// and select the relevant network
function checkXpub(xpub) {
  const prefix = xpub.substring(0, 4);
  
  if (prefix === 'xpub') {
    global.network = BITCOIN_NETWORK;
  }
  else if (prefix === 'Ltub') {
    global.network = LITECOIN_NETWORK;
  }
  else {
    throw new Error("INVALID XPUB: " + xpub + " has not a valid prefix");
  }

  try {
    bip32.fromBase58(xpub, global.network);
  }
  catch (e) {
    throw new Error("INVALID XPUB: " + xpub + " is not a valid xpub -- " + e);
  }
}

module.exports = { 
  checkXpub, 
  getJSON
}