import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, 'packages');
const nodeTestConcurrency = process.env.VT_PLATFORM_NODE_TEST_CONCURRENCY ?? '1';

function walkSpecs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSpecs(fullPath, out);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      out.push(fullPath);
    }
  }

  return out;
}

function walkScriptSpecs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkScriptSpecs(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.spec.mjs')) {
      out.push(fullPath);
    }
  }
  return out;
}

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`[${label}] ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runManySequentially(label, buildCommand) {
  for (const [index, spec] of nodeSpecs.entries()) {
    const { command, args } = buildCommand(spec);
    console.log(`[${label}] ${index + 1}/${nodeSpecs.length} ${path.relative(rootDir, spec)}`);
    run(label, command, args);
  }
}

const specs = walkSpecs(packagesDir);
const scriptSpecs = walkScriptSpecs(path.join(rootDir, 'scripts'));
const nodeSpecs = [];
const jestSpecs = [];

for (const spec of specs) {
  const source = readFileSync(spec, 'utf8');
  if (source.includes('node:test')) {
    nodeSpecs.push(spec);
  } else {
    jestSpecs.push(spec);
  }
}

function resolveBin(binPath) {
  const localBin = path.join(rootDir, 'node_modules', ...binPath);
  if (existsSync(localBin)) return localBin;
  const parentBin = path.join(rootDir, '..', '..', 'node_modules', ...binPath);
  if (existsSync(parentBin)) return parentBin;
  return null;
}

if (scriptSpecs.length > 0) {
  run('script-guards', process.execPath, ['--test', `--test-concurrency=${nodeTestConcurrency}`, ...scriptSpecs]);
}

if (nodeSpecs.length > 0) {
  const tsxCli = resolveBin(['tsx', 'dist', 'cli.mjs']);
  runManySequentially('node:test', (spec) => {
    const tsxArgs = tsxCli
      ? [tsxCli, '--test', `--test-concurrency=${nodeTestConcurrency}`, spec]
      : ['--test', `--test-concurrency=${nodeTestConcurrency}`, spec];
    return {
      command: tsxCli ? process.execPath : 'tsx',
      args: tsxArgs,
    };
  });
}

if (jestSpecs.length > 0) {
  const vitestCli = resolveBin(['vitest', 'vitest.mjs']);
  if (!vitestCli) {
    console.error(`[vitest] Missing Vitest CLI in local or parent node_modules`);
    process.exit(1);
  }

  const vitestArgs = [
    vitestCli,
    'run',
    '--config',
    path.join(rootDir, 'vitest.config.mts'),
    '--no-file-parallelism',
    '--maxWorkers=1',
    ...jestSpecs,
  ];

  run('vitest', process.execPath, vitestArgs);
}
