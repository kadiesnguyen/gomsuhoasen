const { spawnSync } = require('node:child_process');

let tscBin;
try {
  tscBin = require.resolve('typescript/bin/tsc');
} catch (error) {
  console.error('Unable to resolve local TypeScript compiler. Run npm ci before typechecking.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [tscBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
