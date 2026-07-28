#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { resolveCrossProjectEcosystem } from './lib/cross-project-ecosystem.mjs';

const requireProjectRoots =
  process.argv.includes('--require-roots') ||
  ['1', 'true', 'yes'].includes(String(process.env.CROSS_PROJECT_REQUIRE_ROOTS ?? '').toLowerCase());

const trackedPackages = [
  '@nestjs/common',
  '@nestjs/core',
  '@nestjs/mongoose',
  '@nestjs/platform-express',
  'mongoose',
  'typescript',
  'nx',
  'helmet',
];

const sharedSubmoduleNames = [
  'vt-auth-primitives',
  'vt-common-utils',
  'vt-nest-core',
  'vt-platform',
];

function readPackageJson(project) {
  if (!fs.existsSync(project.packageJsonPath)) return null;
  return JSON.parse(fs.readFileSync(project.packageJsonPath, 'utf8'));
}

function resolvePackageVersion(manifest, packageName) {
  return manifest.dependencies?.[packageName]
    ?? manifest.devDependencies?.[packageName]
    ?? manifest.peerDependencies?.[packageName]
    ?? null;
}

function parseMajor(versionRange) {
  if (!versionRange) return null;
  const match = String(versionRange).match(/(\d+)(?:\.\d+)?(?:\.\d+)?/);
  return match ? Number(match[1]) : null;
}

function classifyMajorDrift(majors) {
  const uniqueMajors = Array.from(new Set(majors.filter((major) => major !== null))).sort((a, b) => a - b);
  if (uniqueMajors.length <= 1) return 'aligned';
  return `major-drift:${uniqueMajors.join('/')}`;
}

function classifyPinDrift(shas) {
  const uniquePins = Array.from(new Set(shas.filter(Boolean)));
  if (uniquePins.length <= 1) return 'aligned';
  return `pin-drift:${uniquePins.length}`;
}

function shortSha(value) {
  return value ? value.slice(0, 12) : null;
}

function tryGit(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function readSharedSubmodulePin(project, submoduleName) {
  if (!project.sharedSubmodulesBase) return null;

  const gitRoot = tryGit(project.root, ['rev-parse', '--show-toplevel']);
  if (!gitRoot) return null;

  const relativePath = path.posix.join(
    ...project.sharedSubmodulesBase.split(/[\\/]+/).filter(Boolean),
    submoduleName,
  );
  const sha = tryGit(project.root, ['rev-parse', `HEAD:${relativePath}`]);
  return sha || null;
}

const ecosystem = resolveCrossProjectEcosystem({
  scriptUrl: import.meta.url,
  cwd: process.cwd(),
});
const findings = [];
const manifestRows = [];

for (const project of ecosystem.projects) {
  const manifest = readPackageJson(project);
  if (!manifest) {
    manifestRows.push({ project, exists: false, versions: {} });
    if (requireProjectRoots) {
      findings.push(`missing package.json for ${project.name}: ${project.packageJsonPath}`);
    }
    continue;
  }

  const versions = {};
  for (const packageName of trackedPackages) {
    versions[packageName] = resolvePackageVersion(manifest, packageName);
  }
  manifestRows.push({ project, exists: true, versions });
}

const packageSummaries = trackedPackages.map((packageName) => {
  const entries = manifestRows.map((row) => ({
    projectName: row.project.name,
    version: row.versions[packageName] ?? null,
    major: parseMajor(row.versions[packageName]),
  }));

  return {
    packageName,
    entries,
    drift: classifyMajorDrift(entries.map((entry) => entry.major)),
  };
});

const pinRows = ecosystem.projects
  .filter((project) => project.sharedSubmodulesBase)
  .map((project) => ({
    project,
    pins: Object.fromEntries(
      sharedSubmoduleNames.map((submoduleName) => [
        submoduleName,
        readSharedSubmodulePin(project, submoduleName),
      ]),
    ),
  }));

for (const row of pinRows) {
  for (const submoduleName of sharedSubmoduleNames) {
    if (requireProjectRoots && !row.pins[submoduleName]) {
      findings.push(`missing gitlink pin for ${row.project.name}:${submoduleName}`);
    }
  }
}

const pinSummaries = sharedSubmoduleNames.map((submoduleName) => {
  const entries = pinRows.map((row) => ({
    projectName: row.project.name,
    sha: row.pins[submoduleName],
  }));

  return {
    submoduleName,
    entries,
    drift: classifyPinDrift(entries.map((entry) => entry.sha)),
  };
});

console.log(`workspace_root=${ecosystem.workspaceRoot}`);
console.log(`ecosystem_manifest=${ecosystem.manifestPath}`);
for (const row of manifestRows) {
  console.log(
    `PROJECT ${row.project.name} root_exists=${row.project.rootExists ? 'true' : 'false'} package_exists=${row.exists ? 'true' : 'false'} root=${row.project.root} package_json=${row.project.packageJsonPath}`,
  );
}

for (const summary of packageSummaries) {
  const versions = summary.entries
    .map((entry) => `${entry.projectName}=${entry.version ?? '-'}`)
    .join(' ');
  console.log(`PACKAGE ${summary.packageName} drift=${summary.drift} ${versions}`);
}

for (const summary of pinSummaries) {
  const pins = summary.entries
    .map((entry) => `${entry.projectName}=${shortSha(entry.sha) ?? '-'}`)
    .join(' ');
  console.log(`GITLINK ${summary.submoduleName} drift=${summary.drift} ${pins}`);
}

if (findings.length > 0) {
  console.error('DEPENDENCY_DRIFT_SCAN_FAILED');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('DEPENDENCY_DRIFT_SCAN_PASS');
