const check_balances = require('./actions/check_balances')
const compare = require('./actions/compare');
const { checkXpub } = require('./helpers');

var args = process.argv.slice(2);
if (typeof args[0] === 'undefined') {
  console.log("Missing xpub");
  process.exit(1);
}

const xpub = args[0];
checkXpub(xpub);

if (typeof args[1] === 'undefined') {
  // case 1. <xpub> => 
  // check balance for all active addresses
  check_balances.run(xpub);
}
else {
  if (typeof args[2] !== 'undefined') {
    // case 2. <xpub> <account> <index> =>
    // check balances for specific address
    const account = parseInt(args[1]);
    const index = parseInt(args[2]);
    check_balances.run(xpub, account, index);
  }
  else if (isNaN(args[1])) {
    // case 3. <xpub> <address> => 
    // compare xpub with address
    const address = args[1];
    compare.run(xpub, address);
  }
}
