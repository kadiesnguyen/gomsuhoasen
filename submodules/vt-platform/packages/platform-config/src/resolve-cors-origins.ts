export interface ResolveCorsOriginsOptions {
  corsOrigins?: string;
  nodeEnv?: string;
  devOrigins?: readonly string[];
}

export interface ResolveCorsOriginEntriesOptions {
  corsOrigins?: string;
  nodeEnv?: string;
  devOrigins?: ReadonlyArray<string | RegExp>;
  requiredMessage?: string;
  createError?: (message: string) => Error;
}

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3200',
  'http://localhost:3201',
  'http://localhost:5173',
] as const;

export const CORS_CONFIG_DEFAULT_MESSAGES = {
  REQUIRED_OUTSIDE_DEV: 'CORS_ORIGIN must be configured when runtime environment is not development-like',
  INVALID_ORIGIN_REGEX: (entry: string) => `Invalid CORS origin regex: ${entry}`,
} as const;

function readLowercaseConfigToken(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function parseCorsOriginList(corsOrigins: string | undefined): string[] {
  if (corsOrigins === undefined) {
    return [];
  }

  return corsOrigins
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function isDevLikeEnv(nodeEnv?: string): boolean {
  const normalized = readLowercaseConfigToken(nodeEnv);
  return normalized !== undefined && ['development', 'dev', 'local', 'test', 'tester'].includes(normalized);
}

export function resolveCorsOrigins(options: ResolveCorsOriginsOptions): boolean | string[] {
  const devOrigins = options.devOrigins ?? DEFAULT_DEV_ORIGINS;
  const entries = parseCorsOriginList(options.corsOrigins);

  if (entries.length > 0) {
    if (!isDevLikeEnv(options.nodeEnv)) return entries;
    return Array.from(new Set([...entries, ...devOrigins]));
  }
  if (isDevLikeEnv(options.nodeEnv)) return true;
  throw new Error(CORS_CONFIG_DEFAULT_MESSAGES.REQUIRED_OUTSIDE_DEV);
}

const DEFAULT_DEV_ORIGIN_ENTRIES = [
  /^https?:\/\/localhost:\d+$/,
  /^https?:\/\/127\.0\.0\.1:\d+$/,
] as const;

export function resolveCorsOriginEntries(
  options: ResolveCorsOriginEntriesOptions,
): Array<string | RegExp> {
  const entries = parseCorsOriginList(options.corsOrigins);

  if (entries.length === 0) {
    if (isDevLikeEnv(options.nodeEnv)) {
      return [...(options.devOrigins ?? DEFAULT_DEV_ORIGIN_ENTRIES)];
    }
    throwConfigError(
      options,
      options.requiredMessage ?? CORS_CONFIG_DEFAULT_MESSAGES.REQUIRED_OUTSIDE_DEV,
    );
  }

  return entries.map((entry) => parseCorsOriginEntry(entry, options));
}

function parseCorsOriginEntry(
  entry: string,
  options: ResolveCorsOriginEntriesOptions,
): string | RegExp {
  if (!entry.startsWith('/')) {
    return entry;
  }

  const lastSlashIndex = entry.lastIndexOf('/');
  if (lastSlashIndex <= 0) {
    throwConfigError(options, CORS_CONFIG_DEFAULT_MESSAGES.INVALID_ORIGIN_REGEX(entry));
  }

  const pattern = entry.slice(1, lastSlashIndex);
  const flags = entry.slice(lastSlashIndex + 1);

  if (!pattern) {
    throwConfigError(options, CORS_CONFIG_DEFAULT_MESSAGES.INVALID_ORIGIN_REGEX(entry));
  }

  try {
    return new RegExp(pattern, flags);
  } catch {
    throwConfigError(options, CORS_CONFIG_DEFAULT_MESSAGES.INVALID_ORIGIN_REGEX(entry));
  }
}

function throwConfigError(options: ResolveCorsOriginEntriesOptions, message: string): never {
  throw (options.createError?.(message) ?? new Error(message));
}
