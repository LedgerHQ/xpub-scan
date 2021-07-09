#!/usr/bin/env node

import { getArgs } from "./input/args";
import { Scanner } from "./actions/scanner";

// eslint-disable-next-line

const args = getArgs();

new Scanner(args).scan();

// see https://nodejs.org/api/process.html#process_signal_events
function handleSignal(signal: string) {
  console.log(`Received ${signal}`);
  process.exit(1);
}

process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);
