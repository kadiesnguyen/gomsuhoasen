const path = require('path');
const fs = require('fs');

const currentDir = fs.realpathSync('/var/www/gomhoasen/current');

// Load .env from deploy root so PM2 inherits production variables
const envPath = path.join(currentDir, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function requireEnv(key) {
  const value = process.env[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required for gomhoasen PM2 deploy`);
  }
  return value;
}

module.exports = {
  apps: [
    {
      name: 'gomhoasen-api',
      cwd: currentDir,
      script: 'dist/apps/api/main.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        API_PORT: '4000',
        UPLOAD_DIR: '/var/www/gomhoasen/uploads',
        GHS_APPLICATION_SCOPE_ID: process.env.GHS_APPLICATION_SCOPE_ID || 'gomhoasen',
        MONGODB_URI: requireEnv('MONGODB_URI'),
        JWT_SECRET: requireEnv('JWT_SECRET'),
        JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://gomhoasen.vn',
      },
      env_production: {},
    },
  ],
};
