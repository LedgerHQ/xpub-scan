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
    const addresses: any[] = [];
    const summary: any[] = [];
    const transactions: any[] = [];
    const comparisons: any[] = [];

    // convert amounts into base unit

    // addresses
    for (const a of data.addresses) {
        addresses.push(
            { 
                addressType: a.addressType,
                derivation: a.getDerivation(),
                address: a.toString(),
                balance: toBaseUnit(a.balance),
                funded: toBaseUnit(a.stats.funded),
                spent: toBaseUnit(a.stats.spent)
            }
        )
    }

    // summary
    for (const s of data.summary) {
        summary.push(
            {
                addressType: s.addressType,
                balance: toBaseUnit(s.balance)
            }
        )
    }

    // transactions
    for (const t of data.transactions) {
        transactions.push(
            {
                date: t.date,
                amount: toBaseUnit(t.amount),
                txid: t.txid,
                block: t.block,
                operationType: t.operationType,
                address: t.address
            }
        )
    }

    // comparisons
    for (const c of data.comparisons) {
        let imported, actual;

        if (typeof(c.imported) !== 'undefined') {
            imported = {
                date: c.imported.date,
                amount: toBaseUnit(c.imported.amount),
                txid: c.imported.txid,
                address: c.imported.address,
                operationType: c.imported.operationType
            }
        }

        if (typeof(c.actual) !== 'undefined') {
            actual = {
                date: c.actual.date,
                amount: toBaseUnit(c.actual.amount),
                txid: c.actual.txid,
                block: c.actual.block,
                address: c.actual.address,
                operationType: c.actual.operationType
            }
        }

        comparisons.push(
            {
                imported,
                actual,
                status: c.status
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
        summary,
        transactions,
        comparisons
    } 

    saveJSON(object, directory);
}

export { save }
