import fs from 'fs';

import { configuration, GAP_LIMIT } from '../settings';

function saveJSON(object: any, directory: string) {

    const analysisJSON = JSON.stringify(object, null, 2);

    // if no filepath/filename specify -> set to current directory
    if (directory === '') {
        directory = __dirname;
    }

    const filepath = 
        directory
        .concat('/')
        .concat(object.meta.xpub)
        .concat('.json')

    fs.writeFile(filepath, analysisJSON, function(err) {
        if (err) {
            console.log(err);
        }
    });

    console.log('\nJSON saved: '.concat(filepath));
}

function save(meta: any, data: any, directory: string) {
    const addresses: any[] = [];
    const summary: any[] = [];

    for (const a of data.addresses) {
        addresses.push(
            { 
                addressType: a.addressType,
                derivation: a.getDerivation(),
                address: a.toString(),
                balance: a.balance,
                funded: a.stats.funded,
                spent: a.stats.spent
            }
        )
    }

    const object = {
        meta: {
            by: "xpub scan <https://github.com/LedgerHQ/xpub-scan>",
            version: meta.version,
            xpub: meta.xpub,
            analysis_date: meta.date,
            currency: configuration.currency,
            provider: configuration.providerType,
            provider_url: configuration.BaseURL,
            gap_limit: GAP_LIMIT
        },
        addresses,
        summary: data.summary,
        transactions: data.transactions,
        comparisons: data.comparisons
    } 

    saveJSON(object, directory);
}

export { save }
