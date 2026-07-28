export type UnknownRecord = Record<string, unknown>;

interface IsRecordOptions {
  allowArray?: boolean;
}

export function isRecord(
  value: unknown,
  options: IsRecordOptions = {},
): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    (options.allowArray === true || !Array.isArray(value))
  );
}
