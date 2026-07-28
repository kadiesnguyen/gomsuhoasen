import { readTextInputValue, readTrimmedString, slugifyVi } from '@vt/common-utils';

export { slugifyVi };

export function readSlugOrGenerate(value: unknown, sourceText: unknown): string {
  return readTrimmedString(value) ?? slugifyVi(readTextInputValue(sourceText));
}
