const { getAddressType, getAddress } = require('./address');
const { showComparisonResult } = require('../display');
const { DERIVATION_SCOPE } = require('../settings');

const chalk = require('chalk');

function partialMatch(provided, derived) {
    for(var i = 0; i < derived.length; ++i) {
        const p = provided.toUpperCase()[i]
        
        if (p === '?') {
            continue;
        }
        
        if (p !== derived.toUpperCase()[i]) {
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
            const generatedAddress = getAddress(addressType, xpub, account, index);
            
            const derivationPath = 
            "m/"
            .concat(account)
            .concat("/")
            .concat(index)
            
            const status =
            range.label.padEnd(18, ' ')
            .concat(derivationPath.padEnd(14, ' '))
            .concat(generatedAddress)
            
            if (generatedAddress.toUpperCase() === providedAddress.toUpperCase()) {
                
                console.log(chalk.green(status)); 
                
                return {
                    account: account,
                    index: index
                }
            }
            
            if (partialSearch && partialMatch(providedAddress, generatedAddress)) {
                console.log(chalk.blueBright(status));
                
                return {
                    partial: generatedAddress,
                    account: account,
                    index: index
                }
            }
            
            console.log(status);  
        }
    }
    
    return {};
}

function run(xpub, address) {
    const quickSearchRange = DERIVATION_SCOPE.quick_search;
    
    quickSearchRange.label = 'quick search';
    
    var result = search(xpub, address, quickSearchRange);
    
    if (Object.keys(result).length === 0) {
        
        const deepSearchRange = DERIVATION_SCOPE.deep_search;
        
        deepSearchRange.label = 'deep search';
        
        result = search(xpub, address, deepSearchRange);
    }
    
    showComparisonResult(xpub, address, result);
}

module.exports = { run }