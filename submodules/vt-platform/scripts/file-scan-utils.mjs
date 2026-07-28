import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const DEFAULT_SKIPPED_DIRECTORIES = ['node_modules', 'dist', 'coverage'];
const DEFAULT_EXTENSIONS = ['.ts', '.tsx'];

export function pathExists(workspaceRoot, relativePath) {
  return existsSync(resolve(workspaceRoot, relativePath));
}

export function readWorkspaceText(workspaceRoot, relativePath) {
  return readFileSync(resolve(workspaceRoot, relativePath), 'utf8');
}

export function readRequiredWorkspaceText(workspaceRoot, relativePath, errors, missingMessage = `missing file: ${relativePath}`) {
  if (!pathExists(workspaceRoot, relativePath)) {
    errors.push(missingMessage);
    return '';
  }

  return readWorkspaceText(workspaceRoot, relativePath);
}

export function readTextFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

export function toPosixRelative(workspaceRoot, filePath) {
  return relative(workspaceRoot, filePath).replace(/\\/g, '/');
}

export function walkSourceFiles(root, options = {}, output = []) {
  if (!existsSync(root)) return output;

  const skippedDirectories = new Set(options.skippedDirectories ?? DEFAULT_SKIPPED_DIRECTORIES);
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const includeSpecs = options.includeSpecs ?? true;

  for (const entry of readdirSync(root)) {
    if (skippedDirectories.has(entry)) continue;

    const absolute = resolve(root, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      walkSourceFiles(absolute, options, output);
      continue;
    }

    if (extensions.some((extension) => entry.endsWith(extension)) && (includeSpecs || !entry.includes('.spec.'))) {
      output.push(absolute);
    }
  }

  return output;
}

export function collectForbiddenTokenViolations(options) {
  const {
    workspaceRoot = process.cwd(),
    scanRoots,
    token,
    message,
    skippedDirectories,
    includeSpecs,
  } = options;

  const errors = [];
  for (const scanRoot of scanRoots) {
    const absoluteRoot = resolve(workspaceRoot, scanRoot);
    for (const file of walkSourceFiles(absoluteRoot, { skippedDirectories, includeSpecs })) {
      const text = readTextFile(file);
      if (text.includes(token)) {
        errors.push(`${toPosixRelative(workspaceRoot, file)}: ${message}`);
      }
    }
  }
  return errors;
}

export function requireSourceIncludes(source, fileLabel, token, errors, message = `missing required token ${token}`) {
  if (!source.includes(token)) {
    errors.push(`${fileLabel}: ${message}`);
  }
}

export function requireSourceTokens(source, fileLabel, tokens, errors, messageForToken) {
  for (const token of tokens) {
    requireSourceIncludes(
      source,
      fileLabel,
      token,
      errors,
      messageForToken ? messageForToken(token) : `missing required token ${token}`,
    );
  }
}

export function forbidSourceIncludes(source, fileLabel, token, errors, message = `forbidden token ${token}`) {
  if (source.includes(token)) {
    errors.push(`${fileLabel}: ${message}`);
  }
}

export function forbidSourcePattern(source, fileLabel, pattern, errors, message) {
  if (pattern.test(source)) {
    errors.push(`${fileLabel}: ${message}`);
  }
}

export function forbidAnySourceIncludes(source, fileLabel, tokens, errors, message) {
  for (const token of tokens) {
    forbidSourceIncludes(source, fileLabel, token, errors, message ?? `forbidden token ${token}`);
  }
}

export function finishGuard(errors, failCode, passMessage) {
  if (errors.length > 0) {
    console.error(failCode);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(passMessage);
}
