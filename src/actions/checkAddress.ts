import chalk from "chalk";

import { getAddressType, getAddress } from "./deriveAddresses";
import { DERIVATION_SCOPE } from "../configuration/settings";
import { TODO_TypeThis } from "../types";

interface Result {
  partial?: string;
  account?: number;
  index?: number;
}

function showError(message: string, derived?: string, provided?: string) {
  let errorMessage = chalk.red("[Comparison error] ".concat(message));

  if (typeof derived !== "undefined") {
    const comparison = "\nProvided address:\t"
      .concat(String(provided))
      .concat("\nFirst derived address:  ")
      .concat(String(derived));

    errorMessage = errorMessage.concat(chalk.redBright(comparison));
  }

  console.log(errorMessage);
}

// TODO?: export in a dedicated module (display.ts)?
function showComparisonResult(xpub: string, address: string, result: Result) {
  console.log("\nXpub:", chalk.whiteBright(xpub));
  console.log("Provided address:", chalk.whiteBright(address));

  if (Object.keys(result).length === 0) {
    // no match
    console.log(
      chalk.redBright(
        "The address does not seem to have been derived from this xpub!",
      ),
    );
  } else {
    const derivationPath = "m/"
      .concat(String(result.account))
      .concat("/")
      .concat(String(result.index));

    if (typeof result.partial === "undefined") {
      // full match
      console.log(
        chalk.greenBright(
          "The address has been derived from this xpub using derivation path ".concat(
            chalk.bold(derivationPath),
          ),
        ),
      );
    } else {
      // partial match
      console.log("Derived address: ", chalk.whiteBright(result.partial));

      console.log(
        chalk.blueBright(
          "There is a partial match between the provided address and the one derived using derivation path ".concat(
            chalk.bold(derivationPath),
          ),
        ),
      );
    }
  }
}

// partial match, using '?' as wildcards
function partialMatch(derived: string, provided: string) {
  for (let i = 0; i < derived.length; ++i) {
    if (provided[i] === "?") {
      continue;
    }

    if (provided[i] !== derived[i]) {
      return false;
    }
  }

  return true;
}

function search(
  xpub: string,
  providedAddress: string,
  range: TODO_TypeThis,
  searchType: string,
): Result {
  const addressType = getAddressType(providedAddress);
  const partialSearch = providedAddress.includes("?");

  for (
    let account = range.account.min;
    account < range.account.max;
    ++account
  ) {
    for (let index = range.index.min; index < range.index.max; ++index) {
      const derivedAddress = getAddress(addressType, xpub, account, index);

      // m/{account}/{index}
      const derivationPath = "m/".concat(account).concat("/").concat(index);

      // quick|deep search    {derivation path}  {derived address}
      const status = searchType
        .padEnd(18, " ")
        .concat(derivationPath.padEnd(14, " "))
        .concat(derivedAddress);

      const derived = derivedAddress.toUpperCase();
      const provided = providedAddress.toUpperCase();

      // perfect match (case insensitive)
      if (derived === provided) {
        console.log(chalk.green(status));

        return {
          account,
          index,
        };
      }

      // partial match (if enabled)
      if (partialSearch && partialMatch(derived, provided)) {
        console.log(chalk.blueBright(status));

        return {
          partial: derivedAddress,
          account,
          index,
        };
      }

      console.log(status);
    }
  }

  return {};
}

// check basic assumptions to avoid useless comparisons
function sanityCheck(xpub: string, provided: string) {
  // check that the settings are set
  if (typeof DERIVATION_SCOPE === "undefined") {
    showError("DERIVATION_SCOPE setting is not defined");
  }

  // check assumptions regarding the provided address
  const derived = getAddress(getAddressType(provided), xpub, 0, 0);

  if (derived.length !== provided.length) {
    // assumption 1. size of provided === size of derived
    showError(
      "Provided address size ≠ derived address size",
      derived,
      provided,
    );
    return false;
  }

  if (derived.toUpperCase()[0] !== provided.toUpperCase()[0]) {
    // assumption 2. derived and provided share the same prefix
    showError("Prefixes mismatch", derived, provided);
    return false;
  }

  return true;
}

function run(xpub: string, providedAddress: string) {
  if (!sanityCheck(xpub, providedAddress)) {
    return;
  }

  const quickSearchRange = DERIVATION_SCOPE.quick_search;

  let result = search(xpub, providedAddress, quickSearchRange, "quick search");

  if (Object.keys(result).length === 0) {
    const deepSearchRange = DERIVATION_SCOPE.deep_search;

    result = search(xpub, providedAddress, deepSearchRange, "deep search");
  }

  showComparisonResult(xpub, providedAddress, result);
}

export { run };
