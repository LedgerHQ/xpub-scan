const minimist = require('minimist');
const chalk = require('chalk');

const check_balances = require('./actions/check_balances')
const compare = require('./actions/compare');
const { checkXpub } = require('./helpers');
const { importTransactions, checkImportedTransactions } = require('./actions/import');

const argv = minimist(process.argv.slice(2));

const xpub = argv._[0];
checkXpub(xpub);

const account = argv.a
const index = argv.i

if (argv.address) {
  // comparison mode
  compare.run(xpub, argv.address);
}
else if (typeof(account) !== 'undefined' && typeof(index) !== 'undefined') {
  // specific derivation mode
  check_balances.run(xpub, parseInt(account), parseInt(index));
}
else {
  // scan mode
  var importedTransactions;

  if (!argv.import) {
    // if no file path has been provided, only the xpub is expected to have
    // been specified
    if (argv._.length > 1) {
      console.log(
        chalk.red('Only 1 arg expected (xpub). Please check the documentation.')
      )
      process.exit(1);
    }
  }
  else {
    // if a file path has been provided, import its transactions
    importedTransactions = importTransactions(argv.import);
  }

  const actualTransactions = check_balances.run(xpub);

  if (typeof(importedTransactions) !== 'undefined') {
    const results = checkImportedTransactions(importedTransactions, actualTransactions);

    if (results.errors.length > 0) {
      process.exit(1);
    }
  }
}