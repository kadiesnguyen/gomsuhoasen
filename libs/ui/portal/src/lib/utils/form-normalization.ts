import {
  hasTrimmedString,
  isNotUndefined,
  readArrayInput,
  readFirstTextInputValue,
  readTextInputValue,
  readTrimmedString,
} from '@vt/common-utils';

export { hasTrimmedString, isNotUndefined as isDefinedString };

export function readStringInput(value: unknown): string {
  return readTextInputValue(value);
}

export function readStringArray(value: unknown): string[] {
  return readArrayInput<unknown>(value).map(readTrimmedString).filter(isNotUndefined);
}

export function readCsvStringList(value: string): string[] {
  return value.split(',').map(readTrimmedString).filter(isNotUndefined);
}

export function readFirstString(value: readonly string[]): string {
  return readFirstTextInputValue(value[0]);
}
