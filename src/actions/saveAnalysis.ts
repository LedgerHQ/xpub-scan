import fs from 'fs';

import { configuration, GAP_LIMIT } from '../settings';

function saveJSON(meta: any, data: any, file: string) {
    const addresses: any[] = [];

    for (const address of data.addresses) {
        addresses.push(
            { 
                type: address.type,
                derivation: address.getDerivation(),
                address: address.toString(),
                balance: address.balance,
                funded: address.stats.funded,
                spent: address.stats.spent
            }
        )
    }

    const analysisJSON = JSON.stringify({
        "meta": {
            "by": "xpub scan <https://github.com/LedgerHQ/xpub-scan>",
            "version": meta.version,
            "xpub": meta.xpub,
            "analysis_date": meta.date,
            "currency": configuration.currency,
            "provider": configuration.providerType,
            "provider_url": configuration.BaseURL,
            "gap_limit": GAP_LIMIT
        },
        "addresses": addresses,
        "summary": data.summary,
        "transactions": data.transactions,
        "comparison": data.comparisons
    }, null, 2);

    // if no filepath/filename specify -> set to current directory
    if (file === '') {
        file = __dirname;
    }

    // if is filepath, add filename (<xpub>.json)
    if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
        file = file
                .concat('/')
                .concat(meta.xpub)
                .concat('.json');
    }

    // if needed, add extension
    if (!file.endsWith('.json')) {
        file = file.concat('.json');
    }

    fs.writeFile(file, analysisJSON, function(err) {
        if (err) {
            console.log(err);
        }
    });

    console.log('\nAnalysis saved: '.concat(file));
}

export { saveJSON }
