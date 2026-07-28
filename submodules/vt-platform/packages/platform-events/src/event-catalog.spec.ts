import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONTENT_MARKETING_CATALOG_TOPICS,
  EVENT_CATALOG_GROUP_DECISIONS,
} from './event-catalog';

describe('platform-events catalog group decisions', () => {
  it('marks canonical, advisory, local, and deprecated topic groups explicitly', () => {
    const statuses = new Set(EVENT_CATALOG_GROUP_DECISIONS.map((decision) => decision.status));

    assert.equal(statuses.has('canonical'), true);
    assert.equal(statuses.has('advisory'), true);
    assert.equal(statuses.has('local'), true);
    assert.equal(statuses.has('deprecated'), true);
  });

  it('keeps legacy ecommerce topics deprecated', () => {
    const legacy = EVENT_CATALOG_GROUP_DECISIONS.find(
      (decision) => decision.group === 'ECOMMERCE_LEGACY_TOPICS',
    );

    assert.equal(legacy?.status, 'deprecated');
  });

  it('catalogs content marketing outcome event topics used by execution traces', () => {
    assert.equal(CONTENT_MARKETING_CATALOG_TOPICS.OUTCOME_PUBLISHED, 'cm.outcome.published');
    assert.equal(CONTENT_MARKETING_CATALOG_TOPICS.OUTCOME_FAILED, 'cm.outcome.failed');
  });
});
