import assert from 'node:assert/strict';
import test from 'node:test';

import { AI_ERROR_CODES } from './ai.codes';
import { FIELDS_ERROR_CODES } from './fields.codes';
import { FILE_ERROR_CODES } from './file.codes';
import { MKTG_ERROR_CODES } from './mktg.codes';
import { WOS_ERROR_CODES } from './wos.codes';

const DOMAIN_GENERIC_CODES = {
  AI: AI_ERROR_CODES,
  FIELDS: FIELDS_ERROR_CODES,
  FILE: FILE_ERROR_CODES,
  MKTG: MKTG_ERROR_CODES,
  WOS: WOS_ERROR_CODES,
} as const;

test('domain generic error codes keep their domain signal and remain unique', () => {
  const seen = new Set<string>();

  for (const [domain, codes] of Object.entries(DOMAIN_GENERIC_CODES)) {
    for (const [key, value] of Object.entries(codes)) {
      if (!key.startsWith('GENERIC_')) {
        continue;
      }

      assert.match(
        value,
        new RegExp(`^${domain}_GENERIC_`),
        `${domain}.${key} must include the domain prefix in the emitted code value`,
      );
      assert.equal(seen.has(value), false, `Duplicate generic error code value: ${value}`);
      seen.add(value);
    }
  }
});
