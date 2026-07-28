import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AI_EXTRACTION_STATUS_VALUES, AiExtractionStatus } from './ai-extraction.contracts';

describe('ai-extraction.contracts', () => {
  it('exposes canonical extraction lifecycle statuses', () => {
    assert.deepEqual(Object.values(AiExtractionStatus), ['PROCESSING', 'COMPLETED', 'FAILED']);
    assert.deepEqual(AI_EXTRACTION_STATUS_VALUES, ['PROCESSING', 'COMPLETED', 'FAILED']);
  });
});
