import fs from "fs";
/**
 * Ensure that args are valid
 * @param  {any} args
 * @returns void
 */
export const checkArgs = (args: any): void => {
    args.xpub = args._[0];

    const xpub = args.xpub;
    const address = args.address;
    const balance = args.balance;
    const save = args.save;

    // xpub: set, non-empty
    if (typeof(xpub) === "undefined" || xpub === "") {
        throw new Error("Xpub is required");
    }

    // address: non-empty
    if (typeof(address) !== "undefined" && address === "") {
        throw new Error("Address should not be empty");
    }

    // imported balance: integer
    if (typeof(balance) !== "undefined") {
        if (balance % 1 !== 0) {
            throw new Error("Balance is not an integer: " + balance);
        }
    }
    
    // imported files: non-empty, exist
    const importedFiles = [args.addresses, args.utxos, args.operations];
    for (const importedFile of importedFiles) {
        if (typeof(importedFile) !== "undefined") {
            if (importedFile === "" || !fs.existsSync(importedFile)) {
                throw new Error("Imported file " + importedFile + " does not exist");
            }
        }
    }

    // save dirpath: exists, is a directory, writtable
    if (typeof(save) !== "undefined") {
        try {
            if (!fs.statSync(save).isDirectory()) {
                throw new Error("Save path " + save + " is not a directory");
            }
        }
        catch {
            throw new Error("Save path " + save + " does not exist");
        }
        
        fs.access(save, fs.constants.W_OK, function(err) {
            if (err) {
                throw new Error("Save directory " + save + " is not writtable");
            }
        });
    }
};