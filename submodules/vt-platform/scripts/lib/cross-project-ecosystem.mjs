import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function ancestorPaths(start) {
  const roots = [];
  let current = path.resolve(start);
  while (true) {
    roots.push(current);
    const parent = path.dirname(current);
    if (parent === current) return roots;
    current = parent;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getManifestPath({ manifestPath, env }) {
  if (manifestPath) return path.resolve(manifestPath);

  const configured = env.CROSS_PROJECT_ECOSYSTEM_MANIFEST;
  if (configured) return path.resolve(configured);

  const helperDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(helperDir, '..', 'cross-project-ecosystem.manifest.json');
}

function resolveWorkspaceRoot(manifest, scriptDir, cwd, env, explicitWorkspaceRoot) {
  if (explicitWorkspaceRoot) return path.resolve(explicitWorkspaceRoot);

  const configured = env[manifest.workspaceRootEnv ?? 'CROSS_PROJECT_ROOT'];
  if (configured) return path.resolve(configured);

  const candidateAncestors = [
    ...ancestorPaths(cwd),
    ...ancestorPaths(scriptDir),
  ];
  const seen = new Set();
  let bestCandidate = null;
  let bestScore = -1;

  for (const candidate of candidateAncestors) {
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const score = manifest.projects.reduce((count, project) => count + Number((project.candidateRoots ?? []).some((rootCandidate) =>
      fs.existsSync(path.join(normalized, rootCandidate)),
    )), 0);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = normalized;
    }
  }

  if (bestCandidate && bestScore > 0) {
    return bestCandidate;
  }

  for (const candidate of candidateAncestors) {
    const normalized = path.resolve(candidate);
    if (manifest.projects.some((project) =>
      (project.candidateRoots ?? []).some((rootCandidate) =>
        fs.existsSync(path.join(normalized, rootCandidate)),
      ),
    )) {
      return normalized;
    }
  }

  return path.resolve(scriptDir, '..', '..');
}

function resolveProjectRoot(workspaceRoot, project, env) {
  for (const envKey of project.rootEnv ?? []) {
    const configured = env[envKey];
    if (configured) return path.resolve(configured);
  }

  for (const candidate of project.candidateRoots ?? []) {
    const resolved = path.join(workspaceRoot, candidate);
    if (fs.existsSync(resolved)) {
      return path.resolve(resolved);
    }
  }

  const fallback = project.candidateRoots?.[0] ?? '.';
  return path.resolve(workspaceRoot, fallback);
}

function assertRelativePath(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty relative path`);
  }
  const normalized = path.normalize(value);
  if (
    path.isAbsolute(value)
    || normalized === '..'
    || normalized.startsWith(`..${path.sep}`)
  ) {
    throw new Error(`${label} must stay within its project root`);
  }
}

export function validateCrossProjectEcosystemManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('ecosystem manifest must be an object');
  }
  if (!Array.isArray(manifest.projects) || manifest.projects.length === 0) {
    throw new Error('ecosystem manifest must declare at least one project');
  }

  const names = new Set();
  for (const [index, project] of manifest.projects.entries()) {
    const label = `projects[${index}]`;
    if (!project || typeof project !== 'object') {
      throw new Error(`${label} must be an object`);
    }
    if (typeof project.name !== 'string' || project.name.trim() === '') {
      throw new Error(`${label}.name must be a non-empty string`);
    }
    if (names.has(project.name)) {
      throw new Error(`duplicate ecosystem project name: ${project.name}`);
    }
    names.add(project.name);

    if (!Array.isArray(project.candidateRoots) || project.candidateRoots.length === 0) {
      throw new Error(`${label}.candidateRoots must contain at least one path`);
    }
    for (const [candidateIndex, candidate] of project.candidateRoots.entries()) {
      assertRelativePath(candidate, `${label}.candidateRoots[${candidateIndex}]`);
    }
    assertRelativePath(project.packageJson ?? 'package.json', `${label}.packageJson`);
    assertRelativePath(project.scanRoot ?? '.', `${label}.scanRoot`);
    if (project.sharedSubmodulesBase !== undefined) {
      assertRelativePath(project.sharedSubmodulesBase, `${label}.sharedSubmodulesBase`);
    }
  }
}

export function resolveCrossProjectEcosystem({
  scriptUrl = import.meta.url,
  cwd = process.cwd(),
  manifestPath,
  workspaceRoot,
  env = process.env,
} = {}) {
  const resolvedManifestPath = getManifestPath({ manifestPath, env });
  const manifest = readJson(resolvedManifestPath);
  validateCrossProjectEcosystemManifest(manifest);
  const scriptDir = path.dirname(fileURLToPath(scriptUrl));
  const resolvedWorkspaceRoot = resolveWorkspaceRoot(
    manifest,
    scriptDir,
    cwd,
    env,
    workspaceRoot,
  );

  const projects = (manifest.projects ?? []).map((project) => {
    const root = resolveProjectRoot(resolvedWorkspaceRoot, project, env);
    const packageJsonPath = path.join(root, project.packageJson ?? 'package.json');
    const scanRootPath = path.resolve(root, project.scanRoot ?? '.');
    return {
      ...project,
      root,
      rootExists: fs.existsSync(root),
      packageJsonPath,
      packageJsonExists: fs.existsSync(packageJsonPath),
      scanRootPath,
      scanRootExists: fs.existsSync(scanRootPath),
    };
  });

  return {
    manifestPath: resolvedManifestPath,
    workspaceRoot: resolvedWorkspaceRoot,
    projects,
  };
}
