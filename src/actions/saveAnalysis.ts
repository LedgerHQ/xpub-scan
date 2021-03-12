import fs from 'fs';

import { configuration, GAP_LIMIT } from '../settings';
import { reportTemplate } from '../templates/report.html'

// @ts-ignore
import sb from 'satoshi-bitcoin';

function toBaseUnit(amount: number) {
    return String(sb.toSatoshi(amount))
}

// TODO
function saveHTML(object: any, directory: string) {
    // reportTemplate
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

    const addresses: any[] = data.addresses.map((e: any) => {
        return { 
            addressType: e.addressType,
            derivation: e.getDerivation(),
            address: e.toString(),
            balance: toBaseUnit(e.balance),
            funded: toBaseUnit(e.stats.funded),
            spent: toBaseUnit(e.stats.spent)
        };
    });

    const summary: any[] = data.summary.map((e: any) => {
        return {
            ...e,
            balance: toBaseUnit(e.balance)
        };
    })

    const transactions: any[] = data.transactions.map((e: any) => {
        return {
            ...e,
            amount: toBaseUnit(e.amount)
        };
    })

    const comparisons: any[] = typeof(data.comparisons) !== 'undefined' ? data.comparisons.map((e: any) => {
        return {
            ...e,
            imported: typeof(e.imported) !== 'undefined' ? {
                ...e.imported,
                amount: toBaseUnit(e.imported.amount)
            } : undefined,
            actual: typeof(e.actual) !== 'undefined' ? {
                ...e.actual,
                amount: toBaseUnit(e.actual.amount)
            } : undefined
        };
    }) : undefined;

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
    saveHTML(object, directory);
}

export { save }
