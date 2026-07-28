#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

function loadDotEnv(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function maskMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<invalid-mongo-uri>';
  }
}

const cwdEnvPath = path.resolve(process.cwd(), '.env');
loadDotEnv(cwdEnvPath);

const deploySharedEnvPath = readEnv('DEPLOY_SHARED_ENV_PATH');
if (deploySharedEnvPath) {
  loadDotEnv(path.resolve(deploySharedEnvPath));
}

const mongoUri = readEnv('MONGODB_URI');
if (!mongoUri) {
  throw new Error('MONGODB_URI is required to reset admin password.');
}

const adminEmail =
  readEnv('ADMIN_SEED_EMAIL', 'PRODUCTION_ADMIN_EMAIL') ||
  'admin@gomhoasen.vn';
const adminPassword =
  readEnv('ADMIN_SEED_PASSWORD', 'PRODUCTION_ADMIN_PASSWORD');
if (!adminPassword || adminPassword.length < 12) {
  throw new Error('ADMIN_SEED_PASSWORD (or PRODUCTION_ADMIN_PASSWORD) with at least 12 characters is required.');
}

const adminName =
  readEnv('ADMIN_SEED_NAME') ||
  'Gom Hoa Sen Admin';

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true, lowercase: true, trim: true },
  hashedPassword: { type: String, select: false },
  role: String,
  status: String,
  isDeleted: Boolean,
  deletedAt: Date,
  lastLoginAt: Date,
}, { collection: 'users', timestamps: true });

const User =
  mongoose.models.UserReset ||
  mongoose.model('UserReset', userSchema, 'users');

async function main() {
  console.log(`[admin-reset] Connecting to ${maskMongoUri(mongoUri)}`);
  await mongoose.connect(mongoUri);
  try {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.findOneAndUpdate(
      { email: adminEmail.toLowerCase() },
      {
        $set: {
          fullName: adminName,
          email: adminEmail.toLowerCase(),
          hashedPassword,
          role: 'ADMIN',
          status: 'ACTIVE',
          isDeleted: false,
        },
        $unset: { deletedAt: '' },
      },
      { upsert: true, returnDocument: 'after' },
    );
    console.log(`[admin-reset] Admin password synced for ${adminEmail}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('[admin-reset] Failed:', error);
  process.exit(1);
});
