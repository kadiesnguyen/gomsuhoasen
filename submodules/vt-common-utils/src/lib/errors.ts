export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function readMongoErrorCode(error: unknown): unknown {
  const payload = readRecord(error);
  const response = readRecord(payload['errorResponse']);
  return payload['code'] ?? response['code'];
}

export function readMongoErrorCodeName(error: unknown): string | undefined {
  const payload = readRecord(error);
  const response = readRecord(payload['errorResponse']);
  const codeName = readTrimmedErrorString(payload['codeName'])
    ?? readTrimmedErrorString(response['codeName']);
  return codeName === undefined ? undefined : codeName.toLowerCase();
}

export function readMongoErrorLabels(error: unknown): string[] {
  const payload = readRecord(error);
  const response = readRecord(payload['errorResponse']);
  return [
    ...readErrorLabelArray(payload['errorLabels']),
    ...readErrorLabelArray(response['errorLabels']),
    ...readErrorLabelSet(payload['errorLabelSet']),
  ];
}

export function readMongoErrorText(error: unknown): string {
  const payload = readRecord(error);
  const response = readRecord(payload['errorResponse']);
  return [
    readTrimmedErrorString(payload['message']),
    readTrimmedErrorString(response['errmsg']),
    readTrimmedErrorString(response['message']),
  ]
    .filter((part): part is string => part !== undefined)
    .join(' ')
    .toLowerCase();
}

export function isMongoDuplicateKeyError(
  error: unknown,
  duplicateKeyCode = 11000,
): boolean {
  return readMongoErrorCode(error) === duplicateKeyCode
    || readMongoErrorText(error).includes('duplicate key');
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
}

function readErrorLabelArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(readTrimmedErrorString)
    .filter((label): label is string => label !== undefined);
}

function readErrorLabelSet(value: unknown): string[] {
  if (!(value instanceof Set)) return [];
  return Array.from(value)
    .map(readTrimmedErrorString)
    .filter((label): label is string => label !== undefined);
}

function readTrimmedErrorString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
