/**
 * Standard JSON-compatible value types.
 *
 * These are intentionally simple type aliases for the JSON specification
 * data model. They allow shared utilities (json-normalizer, domain-error-input,
 * etc.) to reference JSON types without depending on app-specific contracts.
 */

/** JSON primitive: string, number, boolean, or null. */
export type JsonPrimitive = string | number | boolean | null;

/** A JSON-compatible array. */
export type JsonArray = JsonValue[];

/** A plain JSON object (string-keyed, values are JsonValue). */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Any JSON-compatible value.
 *
 * This is the recursive union type representing any value that
 * can be serialized/deserialized as JSON without data loss.
 */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * Type guard: check if a value is a JSON-compatible object (not null, not array).
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null
    && value !== undefined
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every((entry) => isJsonValue(entry));
}

/**
 * Type guard: check if a value is JSON-compatible.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every((entry) => isJsonValue(entry));
  return isJsonObject(value);
}
