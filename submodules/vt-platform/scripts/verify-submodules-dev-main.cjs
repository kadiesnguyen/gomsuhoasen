const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const noFetch = process.argv.includes('--no-fetch');

function runGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function tryGit(args, cwd) {
  try {
    return runGit(args, cwd);
  } catch {
    return '';
  }
}

function shortSha(value) {
  return value.slice(0, 12);
}

function readSubmodules(repoRoot) {
  const gitmodulesPath = path.join(repoRoot, '.gitmodules');
  if (!fs.existsSync(gitmodulesPath)) {
    throw new Error(`Missing .gitmodules at ${gitmodulesPath}`);
  }

  const output = runGit(
    ['config', '--file', gitmodulesPath, '--get-regexp', '^submodule\\..*\\.path$'],
    repoRoot,
  );

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [key, ...valueParts] = line.split(/\s+/);
      const relPath = valueParts.join(' ');
      const branchKey = key.replace(/\.path$/, '.branch');
      const branch = tryGit(['config', '--file', gitmodulesPath, '--get', branchKey], repoRoot) || 'dev/main';
      return { key, relPath, branch };
    });
}

function verifySubmodule(repoRoot, submodule) {
  const absPath = path.join(repoRoot, submodule.relPath);
  const failures = [];

  if (!fs.existsSync(absPath)) {
    return {
      ...submodule,
      absPath,
      head: '',
      upstream: '',
      currentBranch: '',
      dirty: '',
      failures: [`missing path ${submodule.relPath}`],
    };
  }

  const gitDir = tryGit(['rev-parse', '--git-dir'], absPath);
  if (!gitDir) {
    failures.push('not initialized as a git repository');
  }

  if (!noFetch) {
    tryGit(['fetch', 'origin', submodule.branch], absPath);
  }

  const currentBranch = tryGit(['rev-parse', '--abbrev-ref', 'HEAD'], absPath);
  const head = tryGit(['rev-parse', 'HEAD'], absPath);
  const upstream = tryGit(['rev-parse', `origin/${submodule.branch}`], absPath);
  const dirty = tryGit(['status', '--porcelain'], absPath);

  if (currentBranch !== submodule.branch) {
    failures.push(`branch ${currentBranch || '<unknown>'} != ${submodule.branch}`);
  }
  if (dirty) {
    failures.push('working tree is dirty');
  }
  if (!head || !upstream || head !== upstream) {
    failures.push(`HEAD ${head ? shortSha(head) : '<missing>'} != origin/${submodule.branch} ${upstream ? shortSha(upstream) : '<missing>'}`);
  }

  return {
    ...submodule,
    absPath,
    head,
    upstream,
    currentBranch,
    dirty,
    failures,
  };
}

const repoRoot = runGit(['rev-parse', '--show-toplevel'], process.cwd());
const results = readSubmodules(repoRoot).map((submodule) => verifySubmodule(repoRoot, submodule));
const failed = results.filter((result) => result.failures.length > 0);

for (const result of results) {
  const status = result.failures.length > 0 ? 'FAIL' : 'OK';
  const head = result.head ? shortSha(result.head) : '<missing>';
  const details = result.failures.length > 0 ? ` - ${result.failures.join('; ')}` : '';
  console.log(`${status} ${result.relPath} ${result.currentBranch || '<unknown>'} ${head}${details}`);
}

if (failed.length > 0) {
  console.error(`Submodule dev/main verification failed for ${failed.length}/${results.length} submodules.`);
  process.exit(1);
}

console.log(`Submodule dev/main verification passed for ${results.length} submodules.`);
