#!/usr/bin/python3

from bs4 import BeautifulSoup
import json
import os
from pathlib import Path
from subprocess import Popen, PIPE
import sys

base_path = f"{ os.getcwd() }/.github/workflows/regression_tests"


def print_test_status(
    test_type: str,
    product: str,
    provider: str,
    is_success: bool = None,
    report_status: str = None,
    simulated_discrepancy: str = None,
):
    header = "Current test" if is_success is None else "Test result"

    print()
    print("=" * 40, header, "=" * 40)

    if is_success is not None:
        print("PASS" if is_success else "FAIL", "— ", end="")

    print(f"{product} - {provider} provider - ({test_type})")

    if report_status and is_success:
        print(f"Xpub Scan HTML+JSON reports status: {report_status[1]}")

    if simulated_discrepancy:
        print(f"Simulated discrepancy: `{simulated_discrepancy}`")

    print("=" * (82 + len(header)), "\n")


def chech_xpub_scan_reports(data: dict, simulated_discrepancy: str = None) -> tuple:
    xpub = data["xpub"]

    report_path = f"{base_path}/{xpub}"

    html_report_filepath = f"{report_path}.html"
    json_report_filepath = f"{report_path}.json"

    # check HTML report
    ###################

    # the HTML report must exist
    try:
        html_report = open(html_report_filepath, "r").read()
    except:
        return (False, "HTML report not found")

    # the HTML report must be a valid HTML file
    if not bool(BeautifulSoup(html_report, "html.parser").find()):
        print(html_report)
        return (False, "Invalid HTML report")

    os.remove(html_report_filepath)

    # (negative test) the HTML report must contain the simulated discrepancy
    if (
        simulated_discrepancy
        and simulated_discrepancy.lower() not in html_report.lower()
    ):
        return (
            False,
            f"Simulated discrepancy `{simulated_discrepancy}` not found in the HTML report",
        )

    # check JSON report
    ###################

    # the JSON report must exist
    try:
        json_report = open(json_report_filepath, "r").read()
    except:
        return (False, "JSON report not found")

    # the JSON report must be a valid JSON file
    try:
        json.loads(json_report)
    except ValueError:
        print(json_report)
        return (False, "Invalid JSON report")
    finally:
        os.remove(json_report_filepath)

    # (negative test) the JSON report must contain the simulated discrepancy
    if (
        simulated_discrepancy
        and simulated_discrepancy.lower() not in json_report.lower()
    ):
        return (
            False,
            f"Simulated discrepancy `{simulated_discrepancy}` not found in the JSON report",
        )

    return (True, "ok")


def xpub_scan(data: dict, filepath: str, provider: str) -> int:
    xpub = data["xpub"]
    coin = data["coin_ticker"]
    balance = data["balance"]

    cmd = f"node lib/scan.js {xpub} --currency {coin} --operations {filepath} --diff --quiet --save {base_path}"

    if provider == "custom":
        cmd += " --custom-provider"

    # Do not check balance using the default provider as far as Ethereum is concerned
    # Indeed, the default provider does not give enough information
    # Example:
    # Diff [ KO ]: balances mismatch
    #  | imported balance:  1858515270441823
    #  | actual balance:    1858515300000000
    if not (provider == "default" and coin == "ETH"):
        cmd += f" --balance {balance}"

    with Popen(cmd.split(), stdout=PIPE, bufsize=1, universal_newlines=True) as p:
        for line in p.stdout:
            print(line, end="")

    return p.returncode


def run_positive_test(data: dict, provider: str) -> bool:
    print_test_status("positive test", data["product"], provider)

    filepath = f"{base_path}/datasets/positive_tests/{data['filename']}"

    return_code = xpub_scan(data, filepath, provider)

    report_status = chech_xpub_scan_reports(data)

    # positive test passes if the command does not fail
    is_success = return_code == 0 and report_status[0]

    print_test_status(
        "positive test", data["product"], provider, is_success, report_status
    )

    return is_success


def run_negative_test(data: dict, provider: str) -> bool:
    print_test_status("negative test", data["product"], provider)

    filepath = f"{base_path}/datasets/negative_tests/{data['filename']}"

    simulated_discrepancy = data["simulated_discrepancy"]

    return_code = xpub_scan(data, filepath, provider)

    report_status = chech_xpub_scan_reports(data, simulated_discrepancy)

    # negative test passes if the command fails
    is_success = return_code != 0 and report_status[0]

    print_test_status(
        "negative test",
        data["product"],
        provider,
        is_success,
        report_status,
        simulated_discrepancy,
    )

    return is_success


def run_tests(product_under_test=None, currency=None, provider=None):

    if provider is None:
        run_tests(product_under_test, currency, "custom")
        run_tests(product_under_test, currency, "default")
        return

    with open(f"{base_path}/datasets.json", "r") as f:
        dataset = json.load(f)

    ran_tests = False

    for data in dataset:

        # skip separators
        if "_separator_" in data:
            continue

        product = data["product"].lower().replace("-", " ")

        if product_under_test and product_under_test not in product:
            continue

        if currency and currency not in data["coin_ticker"]:
            continue

        test_types = data["test_types"]

        for test_type in test_types:
            is_success = (
                run_positive_test(data, provider)
                if test_type == "positive"
                else run_negative_test(data, provider)
            )

            ran_tests = True

            if not is_success:
                sys.exit(1)

    if not ran_tests:
        print(f"No {product_under_test.upper()} x {currency} test [skipped]")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # test one product, specifyied as argument
        product_under_test = sys.argv[1].lower().strip().replace("-", " ")

        currency = None

        if len(sys.argv) == 4:
            currency = sys.argv[2].upper()
            provider = sys.argv[3].lower()

            # when testing the default provider, remove the API KEY env var
            if provider == "default":
                del os.environ["XPUB_SCAN_CUSTOM_API_KEY_V2"]

        run_tests(product_under_test, currency, provider)
    else:
        # test all
        run_tests()
