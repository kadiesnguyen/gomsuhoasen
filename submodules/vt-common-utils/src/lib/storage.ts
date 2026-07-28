export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export function readStorageText(
  storage: KeyValueStorage,
  key: string,
  fallback: string,
): string {
  try {
    return storage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageText(
  storage: KeyValueStorage,
  key: string,
  value: string,
): void {
  storage.setItem(key, value);
}

export function removeStorageItem(
  storage: KeyValueStorage,
  key: string,
): void {
  try {
    storage.removeItem?.(key);
  } catch {
    // Storage access can fail in restricted browser contexts.
  }
}

export function readStorageJson<T>(
  storage: KeyValueStorage,
  key: string,
  fallback: T,
): T {
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === '') return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorageJson<T>(
  storage: KeyValueStorage,
  key: string,
  value: T,
): void {
  storage.setItem(key, JSON.stringify(value));
}
