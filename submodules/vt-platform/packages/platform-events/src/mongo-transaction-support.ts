type MongoHelloCommand = {
  hello: 1;
};

type MongoHelloResponse = {
  setName?: unknown;
  msg?: unknown;
  logicalSessionTimeoutMinutes?: unknown;
};

export type MongoAdminCommandDb = {
  admin: () => {
    command: (command: MongoHelloCommand) => Promise<MongoHelloResponse>;
  };
};

export type MongoTransactionSupportProbeInput = {
  db: MongoAdminCommandDb | null | undefined;
  warn?: (message: string) => void;
  warnContext?: string;
};

export type MongoTransactionSupportDbProvider =
  | MongoAdminCommandDb
  | null
  | undefined
  | (() => MongoAdminCommandDb | null | undefined);

export type MongoTransactionSupportResolverInput = Omit<MongoTransactionSupportProbeInput, 'db'> & {
  db: MongoTransactionSupportDbProvider;
};

export type MongoTransactionSupportResolver = {
  hasSupport: () => Promise<boolean>;
  getCachedSupport: () => boolean | null;
  clearCache: () => void;
};

const DEFAULT_MONGO_TRANSACTION_SUPPORT_WARN_CONTEXT = 'runtime';

function normalizeWarnContext(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0
    ? normalized
    : DEFAULT_MONGO_TRANSACTION_SUPPORT_WARN_CONTEXT;
}

function resolveMongoTransactionSupportDb(
  provider: MongoTransactionSupportDbProvider,
): MongoAdminCommandDb | null | undefined {
  return typeof provider === 'function' ? provider() : provider;
}

/**
 * Detects whether the current MongoDB deployment can run multi-document
 * transactions. Standalone MongoDB is detected from server hello output.
 */
export async function probeMongoTransactionSupport(
  input: MongoTransactionSupportProbeInput,
): Promise<boolean> {
  const { db, warn, warnContext } = input;

  try {
    if (!db) {
      return false;
    }

    const hello = await db.admin().command({ hello: 1 });
    const isReplicaSet = Boolean(hello.setName);
    const isMongos = hello.msg === 'isdbgrid';
    const hasSessionTimeout = typeof hello.logicalSessionTimeoutMinutes === 'number';
    return (isReplicaSet || isMongos) && hasSessionTimeout;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const context = normalizeWarnContext(warnContext);
    warn?.(`Unable to detect transaction support in ${context}: ${errorMessage}`);
    throw error;
  }
}

export function createMongoTransactionSupportResolver(
  input: MongoTransactionSupportResolverInput,
): MongoTransactionSupportResolver {
  let cachedSupport: boolean | null = null;

  return {
    async hasSupport() {
      if (cachedSupport !== null) {
        return cachedSupport;
      }

      const { db, ...probeInput } = input;
      cachedSupport = await probeMongoTransactionSupport({
        ...probeInput,
        db: resolveMongoTransactionSupportDb(db),
      });
      return cachedSupport;
    },
    getCachedSupport() {
      return cachedSupport;
    },
    clearCache() {
      cachedSupport = null;
    },
  };
}
