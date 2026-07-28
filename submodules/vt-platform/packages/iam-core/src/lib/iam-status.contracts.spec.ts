import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  InvitationStatus,
  MasterDataEntityStatus,
  MembershipStatus,
  ProvisionJobStatus,
  RevocationReason,
  SeedRunMode,
  SeedRunStatus,
  SeedStatus,
  WorkGroupStatus,
} from './iam-status.contracts';

describe('iam-core status contracts', () => {
  it('exposes canonical invitation and membership statuses', () => {
    assert.deepEqual(Object.values(InvitationStatus), ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']);
    assert.deepEqual(Object.values(RevocationReason), ['ADMIN_REVOKE', 'INVITEE_DECLINE']);
    assert.deepEqual(Object.values(MembershipStatus), ['ACTIVE', 'DISABLED', 'INACTIVE']);
  });

  it('exposes canonical seed and provisioning statuses', () => {
    assert.deepEqual(Object.values(SeedStatus), ['DRAFT', 'ACTIVE', 'DEPRECATED']);
    assert.deepEqual(Object.values(SeedRunMode), ['DRY_RUN', 'APPLY']);
    assert.deepEqual(Object.values(SeedRunStatus), ['RUNNING', 'SUCCESS', 'FAILED']);
    assert.deepEqual(Object.values(ProvisionJobStatus), ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED']);
  });

  it('exposes canonical IAM readiness statuses', () => {
    assert.deepEqual(Object.values(MasterDataEntityStatus), ['NOT_STARTED', 'RUNNING', 'DONE', 'FAILED']);
    assert.deepEqual(Object.values(WorkGroupStatus), ['ACTIVE', 'ARCHIVED']);
  });
});
