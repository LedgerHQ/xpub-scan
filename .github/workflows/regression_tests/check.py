#!/usr/bin/python3

from bs4 import BeautifulSoup
import json
import os
from pathlib import Path
from subprocess import Popen, PIPE
import sys

base_path = f"{ os.getcwd() }/.github/workflows/regression_tests"


def print_test_status(test_type: str, product: str, is_success: bool = None, report_status: str = None, simulated_discrepancy: str = None):
    header = "Current test" if is_success is None else "Test result"

    print()
    print("=" * 20, header, "=" * 20)

    if is_success is not None:
        print("PASS" if is_success else "FAIL", "— ", end="")

    print(f"{product} ({test_type})")

    if simulated_discrepancy:
        print(f"Simulated discrepancy: `{simulated_discrepancy}`")

    if report_status:
        print(f"Xpub Scan HTML+JSON reports status: {report_status}")

    print("=" * (42 + len(header)), "\n")


def chech_xpub_scan_reports(data: dict, simulated_discrepancy: str = None) -> str:
    xpub = data['xpub']

    report_path = f"{base_path}/{xpub}"

    html_report_filepath = f"{report_path}.html"
    json_report_filepath = f"{report_path}.json"

    # check HTML report
    ###################

    # the HTML report must exist
    try:
        html_report = open(html_report_filepath, 'r').read()
    except:
        return 'HTML report not found'

    # the HTML report must be a valid HTML file
    if not bool(BeautifulSoup(html_report, "html.parser").find()):
        print(html_report)
        return 'Invalid HTML report'

    os.remove(html_report_filepath)

    # (negative test) the HTML report must contain the simulated discrepancy
    if simulated_discrepancy and simulated_discrepancy.lower() not in html_report.lower():
        return f"Simulated discrepancy `{simulated_discrepancy}` not found in the HTML report"

    # check JSON report
    ###################

    # the JSON report must exist
    try:
        json_report = open(json_report_filepath, 'r').read()
    except:
        return 'JSON report not found'

    # the JSON report must be a valid JSON file
    try:
        json.loads(json_report)
    except ValueError:
        print(json_report)
        return 'Invalid JSON report'
    finally:
        os.remove(json_report_filepath)

    # (negative test) the JSON report must contain the simulated discrepancy
    if simulated_discrepancy and simulated_discrepancy.lower() not in json_report.lower():
        return f"Simulated discrepancy `{simulated_discrepancy}` not found in the JSON report"

    return 'ok'


def xpub_scan(data: dict, filepath: str) -> int:
    xpub = data['xpub']
    coin = data['coin_ticker']

    cmd = f"node lib/scan.js {xpub} --currency {coin} --operations {filepath} --diff --custom-provider --quiet --save {base_path}"

    with Popen(cmd.split(), stdout=PIPE, bufsize=1, universal_newlines=True) as p:
        for line in p.stdout:
            print(line, end='')

    return p.returncode


def run_positive_test(data: dict) -> bool:
    print_test_status("positive test", data['product'])

    filepath = f"{base_path}/datasets/positive_tests/{data['filename']}"

    return_code = xpub_scan(data, filepath)

    report_status = chech_xpub_scan_reports(data)

    # positive test passes if the command does not fail
    is_success = return_code == 0 and report_status == "ok"

    print_test_status(
        "positive test", data['product'], is_success, report_status)

    return is_success


def run_negative_test(data: dict) -> bool:
    print_test_status("negative test", data['product'])

    filepath = f"{base_path}/datasets/negative_tests/{data['filename']}"

    simulated_discrepancy = data['simulated_discrepancy']

    return_code = xpub_scan(data, filepath)

    report_status = chech_xpub_scan_reports(data, simulated_discrepancy)

    # negative test passes if the command fails
    is_success = return_code != 0 and report_status == "ok"

    print_test_status(
        "negative test", data['product'], is_success, report_status, simulated_discrepancy)

    return is_success


if __name__ == "__main__":
    product_under_test = sys.argv[1].lower().strip().replace('-', ' ')

    with open(f"{base_path}/datasets.json", 'r') as f:
        dataset = json.load(f)

    for data in dataset:

        product = data['product'].lower().replace('-', ' ')

        if product_under_test not in product:
            continue

        test_types = data['test_types']

        for test_type in test_types:
            is_success = run_positive_test(
                data) if test_type == "positive" else run_negative_test(data)

            if not is_success:
                sys.exit(1)
