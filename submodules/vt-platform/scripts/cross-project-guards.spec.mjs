import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function createFixture() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vt-guard-'));
  for (const projectName of ['app-a', 'app-b']) {
    fs.mkdirSync(path.join(workspaceRoot, projectName, 'src'), { recursive: true });
    writeJson(path.join(workspaceRoot, projectName, 'package.json'), {
      name: projectName,
      dependencies: {
        '@nestjs/common': '^10.0.0',
        mongoose: '^8.0.0',
      },
    });
    fs.writeFileSync(
      path.join(workspaceRoot, projectName, 'src', 'safe.ts'),
      'export const safe = true;\n',
      'utf8',
    );
  }

  const manifestPath = path.join(workspaceRoot, 'ecosystem.json');
  writeJson(manifestPath, {
    projects: ['app-a', 'app-b'].map((name) => ({
      name,
      candidateRoots: [name],
      packageJson: 'package.json',
      scanRoot: '.',
    })),
  });
  return { workspaceRoot, manifestPath };
}

function runGuard(scriptName, fixture) {
  return spawnSync(
    process.execPath,
    [path.join(scriptsDir, scriptName), '--require-roots'],
    {
      cwd: scriptsDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        CROSS_PROJECT_ROOT: fixture.workspaceRoot,
        CROSS_PROJECT_ECOSYSTEM_MANIFEST: fixture.manifestPath,
      },
    },
  );
}

function createPackageBoundaryFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vt-package-boundary-'));
  const packageDir = path.join(rootDir, 'packages', 'sample');
  fs.mkdirSync(path.join(packageDir, 'src'), { recursive: true });
  writeJson(path.join(packageDir, 'package.json'), {
    name: '@vt/sample',
    peerDependencies: {
      '@nestjs/common': '^10.0.0',
    },
  });
  fs.writeFileSync(
    path.join(packageDir, 'src', 'index.ts'),
    [
      '// import { Injectable } from "mongoose";',
      'import { Injectable } from "@nestjs/common";',
      'export const injectable = Injectable;',
      '',
    ].join('\n'),
    'utf8',
  );
  return { rootDir, packageDir };
}

function runPackageBoundaryGuard(fixture) {
  return spawnSync(
    process.execPath,
    [path.join(scriptsDir, 'package-boundary-scan.mjs')],
    {
      cwd: scriptsDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        VT_PACKAGE_BOUNDARY_ROOT: fixture.rootDir,
      },
    },
  );
}

test('dependency drift guard passes aligned fixtures and fails a missing project manifest', () => {
  const fixture = createFixture();
  try {
    const positive = runGuard('cross-project-dependency-drift-scan.mjs', fixture);
    assert.equal(positive.status, 0, positive.stderr || positive.stdout);
    assert.match(positive.stdout, /DEPENDENCY_DRIFT_SCAN_PASS/);

    fs.rmSync(path.join(fixture.workspaceRoot, 'app-b', 'package.json'));
    const negative = runGuard('cross-project-dependency-drift-scan.mjs', fixture);
    assert.notEqual(negative.status, 0);
    assert.match(`${negative.stdout}\n${negative.stderr}`, /DEPENDENCY_DRIFT_SCAN_FAILED/);
  } finally {
    fs.rmSync(fixture.workspaceRoot, { recursive: true, force: true });
  }
});

test('pattern guard passes safe fixtures and fails a raw runtime exception fixture', () => {
  const fixture = createFixture();
  try {
    const positive = runGuard('cross-project-pattern-scan.mjs', fixture);
    assert.equal(positive.status, 0, positive.stderr || positive.stdout);
    assert.match(positive.stdout, /CROSS_PROJECT_PATTERN_SCAN_PASS/);

    fs.writeFileSync(
      path.join(fixture.workspaceRoot, 'app-a', 'src', 'unsafe.ts'),
      'throw new BadRequestException(\"unsafe\");\n',
      'utf8',
    );
    const negative = runGuard('cross-project-pattern-scan.mjs', fixture);
    assert.notEqual(negative.status, 0);
    assert.match(`${negative.stdout}\n${negative.stderr}`, /CROSS_PROJECT_PATTERN_SCAN_FAIL/);
    assert.match(negative.stdout, /rawRuntimeException/);
  } finally {
    fs.rmSync(fixture.workspaceRoot, { recursive: true, force: true });
  }
});

test('package boundary guard ignores comment-only imports and fails undeclared runtime peers', () => {
  const fixture = createPackageBoundaryFixture();
  try {
    const positive = runPackageBoundaryGuard(fixture);
    assert.equal(positive.status, 0, positive.stderr || positive.stdout);
    assert.match(positive.stdout, /PACKAGE_BOUNDARY_SCAN_PASS/);

    writeJson(path.join(fixture.packageDir, 'package.json'), {
      name: '@vt/sample',
      peerDependencies: {},
    });
    const negative = runPackageBoundaryGuard(fixture);
    assert.notEqual(negative.status, 0);
    assert.match(`${negative.stdout}\n${negative.stderr}`, /PACKAGE_BOUNDARY_SCAN_FAILED/);
    assert.match(negative.stderr, /does not declare peerDependency @nestjs\/common/);
    assert.doesNotMatch(negative.stderr, /peerDependency mongoose/);
  } finally {
    fs.rmSync(fixture.rootDir, { recursive: true, force: true });
  }
});
