#!/usr/bin/python3

import json
import os
from subprocess import Popen, PIPE
import sys

base_path = f"{ os.getcwd() }/.github/workflows/regression_tests"


def print_test_status(is_success, product, test_type):
    print()
    print("=" * 20, "Test result", "=" * 20)
    print("PASS" if is_success else "FAIL", f"— {product} ({test_type})")
    print("=" * 53, "\n")


def xpub_scan(data, filepath):
    xpub = data['xpub']
    coin = data['coin_ticker']

    cmd = f"node lib/scan.js {xpub} --currency {coin} --operations {filepath} --diff --custom-provider --quiet"

    with Popen(cmd.split(), stdout=PIPE, bufsize=1, universal_newlines=True) as p:
        for line in p.stdout:
            print(line, end='')

    return p.returncode


def run_positive_test(data):
    filepath = f"{base_path}/datasets/positive_tests/{data['filename']}"

    print(f"Filepath: {filepath}") 

    return_code = xpub_scan(data, filepath)

    # positive test passes if the command does not fail
    is_success = return_code == 0

    print_test_status(is_success, data['product'], "positive test")

    return is_success


def run_negative_test(data):
    filepath = f"{base_path}/datasets/negative_tests/{data['filename']}"

    return_code = xpub_scan(data, filepath)

    # negative test passes if the command fails
    is_success = return_code != 0

    print_test_status(is_success, data['product'], "negative test")

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