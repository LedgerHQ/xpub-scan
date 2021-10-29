#!/usr/bin/env node

import { getArgs } from "./input/args";
import { Scanner } from "./actions/scanner";
import { ScanResult } from "./types";
import { configuration } from "./configuration/settings";

const args = getArgs();

async function scan() {
  // library mode: suppress all outputs
  if (!configuration.commandLineMode) {
    /* eslint-disable */
    console.log = function () {};
    /* eslint-enable */
    configuration.silent = true;
  }

  const scanResult: ScanResult = await new Scanner(args).scan();
  process.exit(scanResult.exitCode);
}

// see https://nodejs.org/api/process.html#process_signal_events
function handleSignal(signal: string) {
  console.log(`Received ${signal}`);
  process.exit(1);
}

scan();
process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);
