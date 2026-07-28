import { LEDGER_STATUSES, type LedgerStatus } from '@vt/balance-core';

export type ScoreLedgerStatus = Exclude<LedgerStatus, typeof LEDGER_STATUSES.REJECTED>;

export const SCORE_LEDGER_STATUSES = {
  COMPLETED: LEDGER_STATUSES.COMPLETED,
  PENDING: LEDGER_STATUSES.PENDING,
  CANCELLED: LEDGER_STATUSES.CANCELLED,
} as const satisfies Record<string, ScoreLedgerStatus>;

export const SCORE_LEDGER_STATUS_VALUES = Object.values(
  SCORE_LEDGER_STATUSES,
) as ScoreLedgerStatus[];

export const SCORE_LEDGER_INITIAL_STATUS = SCORE_LEDGER_STATUSES.COMPLETED;
