#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(process.env.VT_PACKAGE_BOUNDARY_ROOT ?? defaultRootDir);
const packagesDir = path.join(rootDir, 'packages');

const retiredTokens = [
  `@vt/${'comms-engine'}`,
  `packages/${'comms-engine'}`,
];

const runtimePeerByImport = new Map([
  ['@nestjs/common', '@nestjs/common'],
  ['@nestjs/core', '@nestjs/core'],
  ['@nestjs/event-emitter', '@nestjs/event-emitter'],
  ['@nestjs/mongoose', '@nestjs/mongoose'],
  ['mongoose', 'mongoose'],
  ['rxjs', 'rxjs'],
]);

const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const findings = [];
const packageNames = new Map();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function* walkFiles(current) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
        continue;
      }
      yield* walkFiles(fullPath);
      continue;
    }
    if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function isTextFile(filePath) {
  return /\.(json|md|ts|tsx|js|mjs|cjs|yml|yaml)$/.test(filePath);
}

function isRuntimeTs(filePath) {
  if (!filePath.endsWith('.ts')) return false;
  if (/(\.spec|\.test)\.ts$/.test(filePath)) return false;
  return !filePath.includes(`${path.sep}test${path.sep}`) && !filePath.includes(`${path.sep}tests${path.sep}`);
}

function collectRuntimeImports(packageDir) {
  const imports = new Set();
  const srcDir = path.join(packagesDir, packageDir, 'src');
  if (!fs.existsSync(srcDir)) return imports;

  for (const filePath of walkFiles(srcDir)) {
    if (!isRuntimeTs(filePath)) continue;
    const text = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const visit = (node) => {
      let moduleName = null;
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        && node.moduleSpecifier
        && ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        moduleName = node.moduleSpecifier.text;
      } else if (
        ts.isImportEqualsDeclaration(node)
        && ts.isExternalModuleReference(node.moduleReference)
        && node.moduleReference.expression
        && ts.isStringLiteralLike(node.moduleReference.expression)
      ) {
        moduleName = node.moduleReference.expression.text;
      } else if (
        ts.isCallExpression(node)
        && node.expression.kind === ts.SyntaxKind.ImportKeyword
        && node.arguments.length === 1
        && ts.isStringLiteralLike(node.arguments[0])
      ) {
        moduleName = node.arguments[0].text;
      }

      if (moduleName) {
        for (const importedName of runtimePeerByImport.keys()) {
          if (moduleName === importedName || moduleName.startsWith(`${importedName}/`)) {
            imports.add(importedName);
          }
        }
      }

      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return imports;
}

for (const packageDir of packageDirs) {
  const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    findings.push(`${packageDir}: missing package.json`);
    continue;
  }

  const manifest = readJson(packageJsonPath);
  const expectedName = `@vt/${packageDir}`;
  if (manifest.name !== expectedName) {
    findings.push(`${packageDir}: package name ${manifest.name ?? '<missing>'} does not match ${expectedName}`);
  }

  if (packageNames.has(manifest.name)) {
    findings.push(`${packageDir}: duplicate package name ${manifest.name} also used by ${packageNames.get(manifest.name)}`);
  }
  packageNames.set(manifest.name, packageDir);

  const runtimeImports = collectRuntimeImports(packageDir);
  const peerDeps = manifest.peerDependencies ?? {};
  for (const importName of runtimeImports) {
    const peerName = runtimePeerByImport.get(importName);
    if (peerName && !Object.prototype.hasOwnProperty.call(peerDeps, peerName)) {
      findings.push(`${packageDir}: imports ${importName} at runtime but does not declare peerDependency ${peerName}`);
    }
  }
}

for (const filePath of walkFiles(rootDir)) {
  if (!isTextFile(filePath)) continue;
  if (filePath.includes(`${path.sep}.git${path.sep}`) || filePath.includes(`${path.sep}node_modules${path.sep}`)) {
    continue;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const token of retiredTokens) {
    if (text.includes(token)) {
      findings.push(`${path.relative(rootDir, filePath)}: references retired token ${token}`);
    }
  }
}

console.log(`packages=${packageDirs.length}`);
console.log(`package_names=${Array.from(packageNames.keys()).sort().join(', ')}`);

if (findings.length > 0) {
  console.error('PACKAGE_BOUNDARY_SCAN_FAILED');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('PACKAGE_BOUNDARY_SCAN_PASS');
