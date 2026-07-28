import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import * as mongoose from 'mongoose';
import {
  SEED_MODEL_NAMES,
  UserSchema, ProductSchema, ArtisanSchema, SiteConfigSchema,
  RfqSchema, QuoteSchema, AuditLogSchema
} from './seed/seed.shared';
import { seedBase } from './seed/profiles/base.profile';
import { seedUat } from './seed/profiles/uat.profile';
import { seedE2e } from './seed/profiles/e2e.profile';
import { requireMongodbUri } from '@vt/platform-config';

const PROFILE = process.env.SEED_PROFILE || 'base';
const RESET_DATABASE = process.env.SEED_RESET === '1';

function maskMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<invalid-mongo-uri>';
  }
}

function resolveDefaultSeedMongoUri(): string {
  return requireMongodbUri();
}

export interface SeedRunOptions {
  resetDatabase?: boolean;
}

export async function runSeed(
  uri = resolveDefaultSeedMongoUri(),
  profile = PROFILE,
  options: SeedRunOptions = {}
) {
  const resetDatabase = options.resetDatabase ?? RESET_DATABASE;
  Logger.log(`🌱 Connecting to ${maskMongoUri(uri)} with profile [${profile}]`, 'SeedRunner');
  const connection = await mongoose.connect(uri);
  if (resetDatabase) {
    Logger.log(`🧹 Resetting database before seed [${profile}]`, 'SeedRunner');
    const database = connection.connection.db;
    if (!database) {
      throw new Error(`MongoDB database handle is not ready after connecting for seed profile [${profile}]`);
    }
    await database.dropDatabase();
  }

  const models = {
    User: mongoose.models[SEED_MODEL_NAMES.USER] || mongoose.model(SEED_MODEL_NAMES.USER, UserSchema),
    Product: mongoose.models[SEED_MODEL_NAMES.PRODUCT] || mongoose.model(SEED_MODEL_NAMES.PRODUCT, ProductSchema),
    Artisan: mongoose.models[SEED_MODEL_NAMES.ARTISAN] || mongoose.model(SEED_MODEL_NAMES.ARTISAN, ArtisanSchema),
    SiteConfig: mongoose.models[SEED_MODEL_NAMES.SITE_CONFIG] || mongoose.model(SEED_MODEL_NAMES.SITE_CONFIG, SiteConfigSchema),
    Rfq: mongoose.models[SEED_MODEL_NAMES.RFQ] || mongoose.model(SEED_MODEL_NAMES.RFQ, RfqSchema),
    Quote: mongoose.models[SEED_MODEL_NAMES.QUOTE] || mongoose.model(SEED_MODEL_NAMES.QUOTE, QuoteSchema),
    AuditLog: mongoose.models[SEED_MODEL_NAMES.AUDIT_LOG] || mongoose.model(SEED_MODEL_NAMES.AUDIT_LOG, AuditLogSchema),
  };

  let result;
  switch (profile) {
    case 'base':
      result = await seedBase();
      break;
    case 'uat':
      result = await seedUat();
      break;
    case 'e2e':
      result = await seedE2e();
      break;
    default:
      throw new Error(`Unknown seed profile: ${profile}`);
  }

  Logger.log(`✅ Seed [${profile}] complete! Verification: ${result.verified}`, 'SeedRunner');
  
  if (profile === 'e2e' && result && 'counts' in result) {
    Logger.log(`E2E Counts: ${JSON.stringify(result.counts)}`, 'SeedRunner');
  }

  return models; // Return models if caller needs to disconnect or query
}

// If run directly from CLI
if (require.main === module) {
  runSeed()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch(err => {
      Logger.error('❌ Seed failed', err, 'SeedRunner');
      process.exit(1);
    });
}
