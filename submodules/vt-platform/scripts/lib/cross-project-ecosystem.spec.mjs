import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  resolveCrossProjectEcosystem,
  validateCrossProjectEcosystemManifest,
} from './cross-project-ecosystem.mjs';

function withFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vt-ecosystem-'));
  try {
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('resolves package and scan roots from one portable ecosystem manifest', () => {
  withFixture((workspaceRoot) => {
    fs.mkdirSync(path.join(workspaceRoot, 'app', 'runtime'), { recursive: true });
    writeJson(path.join(workspaceRoot, 'app', 'package.json'), { name: 'app' });
    const manifestPath = path.join(workspaceRoot, 'ecosystem.json');
    writeJson(manifestPath, {
      projects: [{
        name: 'app',
        candidateRoots: ['app'],
        packageJson: 'package.json',
        scanRoot: 'runtime',
      }],
    });

    const result = resolveCrossProjectEcosystem({
      manifestPath,
      workspaceRoot,
      env: {},
    });

    assert.equal(result.projects[0].root, path.join(workspaceRoot, 'app'));
    assert.equal(result.projects[0].packageJsonExists, true);
    assert.equal(result.projects[0].scanRootPath, path.join(workspaceRoot, 'app', 'runtime'));
    assert.equal(result.projects[0].scanRootExists, true);
  });
});

test('project root environment overrides remain explicit and testable', () => {
  withFixture((workspaceRoot) => {
    const overriddenRoot = path.join(workspaceRoot, 'override');
    fs.mkdirSync(overriddenRoot, { recursive: true });
    writeJson(path.join(overriddenRoot, 'package.json'), { name: 'override' });
    const manifestPath = path.join(workspaceRoot, 'ecosystem.json');
    writeJson(manifestPath, {
      projects: [{
        name: 'app',
        rootEnv: ['APP_ROOT'],
        candidateRoots: ['missing-default'],
        packageJson: 'package.json',
      }],
    });

    const result = resolveCrossProjectEcosystem({
      manifestPath,
      workspaceRoot,
      env: { APP_ROOT: overriddenRoot },
    });

    assert.equal(result.projects[0].root, overriddenRoot);
    assert.equal(result.projects[0].packageJsonExists, true);
  });
});

test('rejects duplicate names and paths that escape a project root', () => {
  assert.throws(
    () => validateCrossProjectEcosystemManifest({
      projects: [
        { name: 'duplicate', candidateRoots: ['a'] },
        { name: 'duplicate', candidateRoots: ['b'] },
      ],
    }),
    /duplicate ecosystem project name/,
  );
  assert.throws(
    () => validateCrossProjectEcosystemManifest({
      projects: [{
        name: 'escape',
        candidateRoots: ['app'],
        packageJson: '../outside.json',
      }],
    }),
    /must stay within its project root/,
  );
});
