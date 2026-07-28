import { requireFirstEnv, type EnvSource } from './require-env';

export function requireMongoUri(source?: EnvSource): string {
  return requireFirstEnv(['MONGO_URI', 'MONGODB_URI'], source);
}

export function requireMongodbUri(source?: EnvSource): string {
  return requireFirstEnv(['MONGODB_URI', 'MONGO_URI'], source);
}
