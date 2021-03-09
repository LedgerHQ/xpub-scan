import fs from 'fs';

import { configuration } from '../settings';

function saveJSON(meta: any, data: any) {
    let addresses: any[] = [];

    for (const address of data.addresses) {
        addresses.push(
            { 
                type: address.type,
                derivation: address.getDerivation(),
                address: address.address,
                balance: address.balance,
                funded: address.stats.funded,
                spent: address.stats.spent
            }
        )
    }

    const JSONobject = JSON.stringify({
        "meta": {
            "by": "xpub scan <https://github.com/LedgerHQ/xpub-scan>",
            "version": meta.version,
            "xpub": meta.xpub,
            "date": meta.date,
            "currency": configuration.currency,
            "provider": configuration.providerType
        },
        "addresses": addresses,
        "summary": data.summary,
        "transactions": data.transactions,
        "comparison": data.comparisons
    }, null, 2);

    const filename = meta.xpub.concat('.json');

    fs.writeFile(filename, JSONobject, function(err) {
        if (err) {
            console.log(err);
        }
    });

    console.log('\nAnalysis saved as '.concat(filename));
}

export { saveJSON }
