# Welcome!

Thank you for investing your time in contributing to Xpub Scan!

In this guide, you will get an overview of its core principles as well as the contribution workflow.

# Core Principles

Xpub Scan is based on four core principles that are expected to be reflected in each incremental development.

- It is product agnostic
- It works out of the box
- It is stateless
- It is privacy-focused

## 1. Product Agnostic

One consequence of this principle is that Xpub Scan is required to work with Live and LES (Ledger Enterprise Solutions) products when using the comparison feature.

To help enforce this principle, the regression tests are targeting both the Live (Live-common, Live Desktop) and the LES components.

Rationale: Xpub Scan is used by both business-to-consumer and business-to-business teams.

## 2. Works Out the Box

Anyone should be able to just clone, build, and run Xpub Scan. It should just work without additional configuration.

Advanced users should also be able to customize the tool to use robust external providers.

As a consequence, Xpub Scan uses two categories of providers: free providers (referred to by the `DEFAULT_API_URLS` variable in `src/configuration/settings.ts`) and a paid providers (CryptoAPIs: `CRYPTOAPIS_URL`).

In the code, the free providers are labeled as _default_ providers while CryptoAPIs is labeled as the _custom_ provider.

The free providers are not as reliable as the paid provider. Consequently, Xpub Scan has to display a warning message when the free provider is being used to inform the user about such limitations. The current warning message is: “_(only the last ~50 operations by address are displayed)_". This is a hard requirement.

Rationale: Xpub Scan is used outside Ledger and should not depend on one provider.

## 3. Stateless

Xpub Scan is not a wallet: there is no need to maintain an internal state.

Using a database would complexify the tool, notably by implementing a mechanism ensuring the correct synchronization of such a database.

## 4. Privacy-Focused

Xpub Scan should _never_ send xpubs to external providers and only fetch the minimum information (transactions per address that it derives itself).

# Setting up the development environment

Use Node **LTS**. The most recent versions of Node may trigger [OpenSSL-related errors](https://github.com/webpack/webpack/issues/14532)).

At the root of the project, a `.env` file, containing a valid [CryptoAPIs API v2 key](https://developers.cryptoapis.io/technical-documentation/general-information/overview), is required to enable the custom provider.

```
XPUB_SCAN_CUSTOM_API_KEY_V2=<your key>
```

# Implementing

## Properly Format the Code

Your code has to be correctly formatted. To this effect, a set of rules are defined in `.prettierrc.json` and automatically enforced with this command:

```
$ yarn prettier
```

## Add Unit Tests

When implementing a new feature, please add corresponding unit tests.

You can also contribute to the project by enhancing the current code coverage.

The general idea is to progressively reach near 100% coverage.

# Testing

Once your fix or feature has been implemented, you can locally ensure that the project will pass the tests in the CI.

(Note: you can run all tests at once: `$ yarn dev:test:all`).

## Up-to-date Requirements

For security reasons, the dependencies have to be up-to-date and strictly pinpointed.

To this effect, a dedicated command verifies the dependencies:

```
$ yarn check:dep
```

If this command reveals that dependencies are outdated, update them in `package.json` **using strict versioning**:

- `1.2.3` ✅
- `^1.2.3` ❌
- `~1.2.3` ❌

Run `check:dep` again and, if the check passes, run the subsequent tests to ensure that the newest dependencies do not break anything.

## Unit Tests

To run the unit tests, do:

```
$ yarn ci
```

To generate the coverage (prerequisites: `jest` and `ts-node`, run:

```
$ jest --collect-coverage
```

An HTML report will be generated in `./coverage/lcov-report/`.

## Regression Tests

Regression tests are essential to ensure that the core logic of Xpub Scan is not negatively affected by new features and/or fixes. They consist of scanning ad hoc xpubs and performing comparisons using products exports (see: `.github/workflows/regression_tests/datasets.json`). Both positive and negative tests are running: positive tests ensure that Xpub Scan does not detect erroneous discrepancies; negative tests ensure that Xpub Scan can detect fake discrepancies, injected for testing purposes into the exports of the products.

To run the regression tests locally, use the following command:

```
$ yarn regression
```

(Important: the tests will fail if no CryptoAPIs API v2 key is provided).

# Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](https://github.com/LedgerHQ/xpub-scan/blob/main/LICENSE) that covers the project.
