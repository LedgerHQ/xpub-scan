import fs from 'fs';

import { configuration, GAP_LIMIT } from '../settings';

// @ts-ignore
import sb from 'satoshi-bitcoin';

function toBaseUnit(amount: number) {
    return String(sb.toSatoshi(amount))
}

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

    // convert amounts into base unit

    const addresses: any[] = [];
    data.addresses.forEach((e: any) => {
        addresses.push(
            { 
                addressType: e.addressType,
                derivation: e.getDerivation(),
                address: e.toString(),
                balance: toBaseUnit(e.balance),
                funded: toBaseUnit(e.stats.funded),
                spent: toBaseUnit(e.stats.spent)
            }
        )  
    });

    const summary = data.summary.map((e: any) => {
        const obj = Object.assign({}, e);
        obj['balance'] = toBaseUnit(e.balance);
        return obj;
    })

    const transactions = data.transactions.map((e: any) => {
        const obj = Object.assign({}, e);
        obj['amount'] = toBaseUnit(e.amount);
        return obj;
    })

    const comparisons = data.comparisons.map((e: any) => {
        const obj = Object.assign({}, e);
        if (typeof(e.imported) !== 'undefined') {
            obj['imported']['amount'] = toBaseUnit(e.imported.amount);
        }
        if (typeof(e.actual) !== 'undefined') {
            obj['actual']['amount'] = toBaseUnit(e.actual.amount);
        }
        return obj;
    })

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
        summary,
        transactions,
        comparisons
    } 

    saveJSON(object, directory);
}

export { save }
