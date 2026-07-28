const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');

function normalizeWorkspaceRoot(workspaceRoot) {
  return path.resolve(workspaceRoot).replace(/\\/g, '/');
}

function createTsconfigPathModuleNameMapper(options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot || process.cwd());
  const tsconfigPath = path.resolve(workspaceRoot, options.tsconfigPath || 'tsconfig.base.json');
  const { compilerOptions = {} } = require(tsconfigPath);

  return pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: `${normalizeWorkspaceRoot(workspaceRoot)}/`,
  });
}

module.exports = {
  createTsconfigPathModuleNameMapper,
};
