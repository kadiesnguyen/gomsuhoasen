export type EnvSource = Record<string, string | undefined>;

export const ENV_CONFIG_ERROR_MESSAGES = {
  REQUIRED: (name: string) => `${name} is required`,
  FIRST_REQUIRED: (names: readonly string[]) => `${names.join(' or ')} is required`,
} as const;

function defaultEnvSource(): EnvSource {
  return (globalThis as { process?: { env?: EnvSource } }).process?.env ?? {};
}

export function requireEnv(name: string, source: EnvSource = defaultEnvSource()): string {
  const value = source[name]?.trim();
  if (!value) {
    throw new Error(ENV_CONFIG_ERROR_MESSAGES.REQUIRED(name));
  }
  return value;
}

export function firstEnv(names: readonly string[], source: EnvSource = defaultEnvSource()): string | undefined {
  for (const name of names) {
    const value = source[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function requireFirstEnv(names: readonly string[], source: EnvSource = defaultEnvSource()): string {
  const value = firstEnv(names, source);
  if (!value) {
    throw new Error(ENV_CONFIG_ERROR_MESSAGES.FIRST_REQUIRED(names));
  }
  return value;
}
