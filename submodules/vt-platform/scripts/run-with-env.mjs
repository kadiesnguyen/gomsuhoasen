#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const separatorIndex = process.argv.indexOf('--');

if (separatorIndex < 0) {
  fail('Usage: node scripts/run-with-env.mjs KEY=value [KEY=value ...] -- command [args...]');
}

const envPairs = process.argv.slice(2, separatorIndex);
const command = process.argv[separatorIndex + 1];
const args = process.argv.slice(separatorIndex + 2);

if (!command) {
  fail('Missing command after --.');
}

const env = { ...process.env };
for (const pair of envPairs) {
  const assignmentIndex = pair.indexOf('=');
  if (assignmentIndex <= 0) {
    fail(`Invalid env assignment "${pair}". Expected KEY=value.`);
  }
  const key = pair.slice(0, assignmentIndex);
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    fail(`Invalid env key "${key}".`);
  }
  env[key] = pair.slice(assignmentIndex + 1);
}

const result = spawnSync(command, args, {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  fail(result.error.message);
}

process.exit(result.status ?? 1);

function fail(message) {
  console.error(message);
  process.exit(1);
}
