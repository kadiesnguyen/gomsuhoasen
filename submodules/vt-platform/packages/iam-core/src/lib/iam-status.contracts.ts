export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export enum RevocationReason {
  ADMIN_REVOKE = 'ADMIN_REVOKE',
  INVITEE_DECLINE = 'INVITEE_DECLINE',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  INACTIVE = 'INACTIVE',
}

export enum SeedStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

export enum SeedRunMode {
  DRY_RUN = 'DRY_RUN',
  APPLY = 'APPLY',
}

export enum SeedRunStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum ProvisionJobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum MasterDataEntityStatus {
  NOT_STARTED = 'NOT_STARTED',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum WorkGroupStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}
