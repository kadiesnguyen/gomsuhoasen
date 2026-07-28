import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MEMBERSHIP_UPGRADE_REQUEST_REVIEWABLE_STATUSES,
  MEMBERSHIP_UPGRADE_REQUEST_SOURCE_REASON,
  MEMBERSHIP_UPGRADE_REQUEST_STATUS,
  SCORE_LEDGER_INITIAL_STATUS,
  SCORE_LEDGER_STATUSES,
  SCORE_LEDGER_STATUS_VALUES,
  SCORE_SOURCE_TYPE_VALUES,
  SCORE_SOURCE_TYPES,
  SCORE_TYPE_VALUES,
  SCORE_TYPES,
  TIER_PROJECTION_STATUS,
  TIER_PUBLICATION_HISTORY_STATUSES,
  TIER_PUBLICATION_REVISION_STATUS,
  TIER_PUBLICATION_ROLLBACK_SOURCE_STATUSES,
  UPGRADE_REQUEST_SOURCE,
  UPGRADE_REQUEST_STATUS,
  type IScoreEntry,
} from '../index';

describe('loyalty-core: contracts structure verification', () => {
  it('should allow instantiating structures satisfying IScoreEntry', () => {
    const entry: IScoreEntry = {
      score_id: 'se_123',
      member_id: 'member_789',
      score_type: SCORE_TYPES.BUYER,
      amount: 500,
      source_type: SCORE_SOURCE_TYPES.ORDER,
      source_id: 'order_456',
      level_at_time: 2,
      description: 'Points earned from order #456',
      created_at: new Date(),
    };
    assert.equal(entry.amount, 500);
    assert.equal(entry.score_type, SCORE_TYPES.BUYER);
  });

  it('should expose canonical score and source values for runtime mappings', () => {
    assert.ok(SCORE_TYPE_VALUES.includes(SCORE_TYPES.POINT_REDEEM));
    assert.ok(SCORE_TYPE_VALUES.includes(SCORE_TYPES.VITATH));
    assert.ok(SCORE_SOURCE_TYPE_VALUES.includes(SCORE_SOURCE_TYPES.COMMISSION));
    assert.ok(SCORE_SOURCE_TYPE_VALUES.includes(SCORE_SOURCE_TYPES.MANUAL));
    assert.deepEqual(SCORE_LEDGER_STATUS_VALUES, [
      SCORE_LEDGER_STATUSES.COMPLETED,
      SCORE_LEDGER_STATUSES.PENDING,
      SCORE_LEDGER_STATUSES.CANCELLED,
    ]);
    assert.equal(SCORE_LEDGER_INITIAL_STATUS, SCORE_LEDGER_STATUSES.COMPLETED);
  });

  it('should expose canonical membership upgrade status and reason contracts', () => {
    assert.equal(UPGRADE_REQUEST_STATUS, MEMBERSHIP_UPGRADE_REQUEST_STATUS);
    assert.equal(UPGRADE_REQUEST_SOURCE, MEMBERSHIP_UPGRADE_REQUEST_SOURCE_REASON);
    assert.deepEqual(MEMBERSHIP_UPGRADE_REQUEST_REVIEWABLE_STATUSES, [
      MEMBERSHIP_UPGRADE_REQUEST_STATUS.APPROVED,
      MEMBERSHIP_UPGRADE_REQUEST_STATUS.REJECTED,
    ]);
  });

  it('should expose canonical tier publication status groupings', () => {
    assert.equal(TIER_PROJECTION_STATUS.CURRENT, 'CURRENT');
    assert.equal(TIER_PUBLICATION_REVISION_STATUS.DRAFT, 'DRAFT');
    assert.deepEqual(TIER_PUBLICATION_HISTORY_STATUSES, [
      TIER_PUBLICATION_REVISION_STATUS.PUBLISHED,
      TIER_PUBLICATION_REVISION_STATUS.ROLLED_BACK,
      TIER_PUBLICATION_REVISION_STATUS.DISCARDED,
    ]);
    assert.deepEqual(TIER_PUBLICATION_ROLLBACK_SOURCE_STATUSES, [
      TIER_PUBLICATION_REVISION_STATUS.PUBLISHED,
      TIER_PUBLICATION_REVISION_STATUS.ROLLED_BACK,
    ]);
  });
});
