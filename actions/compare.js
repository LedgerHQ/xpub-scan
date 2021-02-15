const chalk = require('chalk');

const { getAddressType, getAddress } = require('./address');
const { showComparisonResult } = require('../display');
const { DERIVATION_SCOPE } = require('../settings');

function partialMatch(derived, provided) {
    for (var i = 0; i < derived.length; ++i) {        
        if (provided[i] === '?') {
            continue;
        }
        
        if (provided[i] !== derived[i]) {
            return false;
        }
    }
    
    return true;
}

function search(xpub, providedAddress, range) {
    const addressType = getAddressType(providedAddress);
    const partialSearch = providedAddress.includes('?');
    
    for (var account = range.account.min; account < range.account.max; ++account) {
        for (var index = range.index.min; index < range.index.max; ++index) {
            const derivedAddress = getAddress(addressType, xpub, account, index);
            
            const derivationPath = 
            "m/"
            .concat(account)
            .concat("/")
            .concat(index);
            
            const status =
            range.label.padEnd(18, ' ')
            .concat(derivationPath.padEnd(14, ' '))
            .concat(derivedAddress);

            const derived = derivedAddress.toUpperCase();
            const provided = providedAddress.toUpperCase();
            
            if (derived === provided) {
                
                console.log(chalk.green(status)); 
                
                return {
                    account: account,
                    index: index
                }
            }
            
            if (partialSearch && partialMatch(derived, provided)) {
                console.log(chalk.blueBright(status));
                
                return {
                    partial: derivedAddress,
                    account: account,
                    index: index
                }
            }
            
            console.log(status);  
        }
    }
    
    return {};
}

function showError(message, derived = undefined, provided= undefined) {
    var errorMessage = chalk.red('[Comparison error] '.concat(message));

    if (typeof(derived) !== 'undefined') {
        const comparison = 
            '\nProvided address:\t'
            .concat(provided)
            .concat('\nFirst derived address:  ')
            .concat(derived);

        errorMessage = 
            errorMessage.concat(chalk.redBright(comparison));
    }
    
    console.log(errorMessage);
}

// check basic assumptions to avoid useless comparisons
function sanityCheck(xpub, provided) {
    // check that the settings are set
    if (typeof(DERIVATION_SCOPE) === 'undefined') {
        showError('DERIVATION_SCOPE setting is not defined');
    }

    // check assumptions regarding the provided address
    const derived = getAddress(getAddressType(provided), xpub, 0, 0);    

    if (derived.length !== provided.length) {
        // assumption 1. size of provided === size of derived
        showError('Provided address size ≠ derived address size', derived, provided);
        return false;
    }
    
    if (derived.toUpperCase()[0] !== provided.toUpperCase()[0]) {
        // assumption 2. derived and provided share the same prefix
        showError('Prefixes mismatch', derived, provided);
        return false;
    }

    return true;
}

function run(xpub, providedAddress) {
    if (!sanityCheck(xpub, providedAddress)) {
        return;
    }

    const quickSearchRange = DERIVATION_SCOPE.quick_search;
    
    quickSearchRange.label = 'quick search';
    
    var result = search(xpub, providedAddress, quickSearchRange);
    
    if (Object.keys(result).length === 0) {
        
        const deepSearchRange = DERIVATION_SCOPE.deep_search;
        
        deepSearchRange.label = 'deep search';
        
        result = search(xpub, providedAddress, deepSearchRange);
    }
    
    showComparisonResult(xpub, providedAddress, result);
}

module.exports = { run }