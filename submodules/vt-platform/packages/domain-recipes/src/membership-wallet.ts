import {
  requireFiniteNumber,
  requireNonNegativeFiniteNumber,
  requireNonNegativeInteger,
} from './number-guards';

export type MembershipLedgerStatus =
  | 'pending'
  | 'approved'
  | 'completed'
  | 'paid'
  | 'cancelled'
  | 'rejected'
  | 'failed';

export const MEMBERSHIP_LEDGER_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  FAILED: 'failed',
} as const;

export const MEMBERSHIP_LEDGER_STATUS_VALUES = Object.values(MEMBERSHIP_LEDGER_STATUSES);

export const MEMBERSHIP_LEDGER_STATUS_GROUPS: Record<
  'AVAILABLE' | 'PENDING' | 'LOCKED',
  readonly MembershipLedgerStatus[]
> = {
  AVAILABLE: [MEMBERSHIP_LEDGER_STATUSES.COMPLETED, MEMBERSHIP_LEDGER_STATUSES.PAID],
  PENDING: [MEMBERSHIP_LEDGER_STATUSES.PENDING, MEMBERSHIP_LEDGER_STATUSES.APPROVED],
  LOCKED: [
    MEMBERSHIP_LEDGER_STATUSES.CANCELLED,
    MEMBERSHIP_LEDGER_STATUSES.REJECTED,
    MEMBERSHIP_LEDGER_STATUSES.FAILED,
  ],
} as const;

export const MEMBERSHIP_WALLET_NUMBER_MESSAGES = {
  FINITE_NUMBER: 'must be a finite number.',
  NON_NEGATIVE: 'must be non-negative.',
  INTEGER: 'must be an integer.',
  BETWEEN_0_AND_1: 'must be between 0 and 1.',
  PERCENTAGE_BETWEEN_0_AND_1: (fieldName: string) => `${fieldName} must be between 0 and 1.`,
  LEDGER_BUCKET_REQUIRED: 'membership ledger bucket is required.',
  UNSUPPORTED_LEDGER_STATUS_PREFIX: 'Unsupported membership ledger status:',
  UNSUPPORTED_LEDGER_STATUS: (status: MembershipLedgerStatus) => `Unsupported membership ledger status: ${String(status)}.`,
} as const;

export interface MembershipLedgerBalanceEntry {
  amount: number;
  status: MembershipLedgerStatus;
  bucket: string;
}

export interface MembershipBalanceSnapshot {
  available: number;
  pending: number;
  locked: number;
  total: number;
  buckets: Record<string, { available: number; pending: number; locked: number; total: number }>;
}

export interface WithdrawalRulesConfig {
  min_amount: number;
  max_percentage: number;
  max_pending_per_day: number;
  fee_percentage: number;
  vat_percentage: number;
}

export interface WithdrawalPreview {
  gross_amount: number;
  fee: number;
  vat: number;
  total_deduction: number;
  net_amount: number;
  remaining_balance: number;
}

export type WithdrawalError =
  | 'below_minimum'
  | 'exceeds_maximum'
  | 'daily_limit_reached'
  | 'insufficient_balance'
  | 'bank_info_missing';

export interface WithdrawalValidation {
  valid: boolean;
  errors: WithdrawalError[];
  preview: WithdrawalPreview;
}

export const DEFAULT_WITHDRAWAL_RULES: WithdrawalRulesConfig = {
  min_amount: 200_000,
  max_percentage: 0.80,
  max_pending_per_day: 1,
  fee_percentage: 0.01,
  vat_percentage: 0.10,
};

const WALLET_FINITE_NUMBER_OPTIONS = { message: MEMBERSHIP_WALLET_NUMBER_MESSAGES.FINITE_NUMBER };
const WALLET_NON_NEGATIVE_NUMBER_OPTIONS = {
  nonFiniteMessage: MEMBERSHIP_WALLET_NUMBER_MESSAGES.FINITE_NUMBER,
  negativeMessage: MEMBERSHIP_WALLET_NUMBER_MESSAGES.NON_NEGATIVE,
};
const WALLET_NON_NEGATIVE_INTEGER_OPTIONS = {
  ...WALLET_NON_NEGATIVE_NUMBER_OPTIONS,
  integerMessage: MEMBERSHIP_WALLET_NUMBER_MESSAGES.INTEGER,
};

function requirePercentage(value: number, fieldName: string): number {
  const finite = requireNonNegativeFiniteNumber(value, fieldName, WALLET_NON_NEGATIVE_NUMBER_OPTIONS);
  if (finite > 1) {
    throw new Error(MEMBERSHIP_WALLET_NUMBER_MESSAGES.PERCENTAGE_BETWEEN_0_AND_1(fieldName));
  }
  return finite;
}

function requireLedgerBucket(bucket: string): string {
  if (typeof bucket !== 'string' || bucket.trim().length === 0) {
    throw new Error(MEMBERSHIP_WALLET_NUMBER_MESSAGES.LEDGER_BUCKET_REQUIRED);
  }
  return bucket.trim();
}

function requireLedgerStatus(status: MembershipLedgerStatus): MembershipLedgerStatus {
  if (!MEMBERSHIP_LEDGER_STATUS_VALUES.includes(status)) {
    throw new Error(MEMBERSHIP_WALLET_NUMBER_MESSAGES.UNSUPPORTED_LEDGER_STATUS(status));
  }
  return status;
}

function normalizeWithdrawalRules(rules: WithdrawalRulesConfig): WithdrawalRulesConfig {
  return {
    min_amount: requireNonNegativeFiniteNumber(
      rules.min_amount,
      'withdrawal min_amount',
      WALLET_NON_NEGATIVE_NUMBER_OPTIONS,
    ),
    max_percentage: requirePercentage(rules.max_percentage, 'withdrawal max_percentage'),
    max_pending_per_day: requireNonNegativeInteger(
      rules.max_pending_per_day,
      'withdrawal max_pending_per_day',
      WALLET_NON_NEGATIVE_INTEGER_OPTIONS,
    ),
    fee_percentage: requirePercentage(rules.fee_percentage, 'withdrawal fee_percentage'),
    vat_percentage: requirePercentage(rules.vat_percentage, 'withdrawal vat_percentage'),
  };
}

function emptyBucket() {
  return { available: 0, pending: 0, locked: 0, total: 0 };
}

export function calculateMembershipBalance(entries: MembershipLedgerBalanceEntry[]): MembershipBalanceSnapshot {
  const snapshot: MembershipBalanceSnapshot = {
    available: 0,
    pending: 0,
    locked: 0,
    total: 0,
    buckets: {},
  };

  for (const entry of entries) {
    const amount = requireFiniteNumber(entry.amount, 'membership ledger amount', WALLET_FINITE_NUMBER_OPTIONS);
    const status = requireLedgerStatus(entry.status);
    const bucketKey = requireLedgerBucket(entry.bucket);
    const bucket = snapshot.buckets[bucketKey] ?? emptyBucket();
    snapshot.buckets[bucketKey] = bucket;

    if (MEMBERSHIP_LEDGER_STATUS_GROUPS.AVAILABLE.includes(status)) {
      snapshot.available += amount;
      bucket.available += amount;
    } else if (MEMBERSHIP_LEDGER_STATUS_GROUPS.PENDING.includes(status)) {
      snapshot.pending += amount;
      bucket.pending += amount;
    } else if (MEMBERSHIP_LEDGER_STATUS_GROUPS.LOCKED.includes(status)) {
      snapshot.locked += 0;
    }

    snapshot.total = snapshot.available + snapshot.pending + snapshot.locked;
    bucket.total = bucket.available + bucket.pending + bucket.locked;
  }

  return snapshot;
}

export function validateWithdrawalRequest(params: {
  amount: number;
  available_balance: number;
  pending_today_count: number;
  has_bank_info: boolean;
  rules?: WithdrawalRulesConfig;
}): WithdrawalValidation {
  const rules = normalizeWithdrawalRules(params.rules ?? DEFAULT_WITHDRAWAL_RULES);
  const amount = Math.round(requireNonNegativeFiniteNumber(
    params.amount,
    'withdrawal amount',
    WALLET_NON_NEGATIVE_NUMBER_OPTIONS,
  ));
  const available = Math.round(requireNonNegativeFiniteNumber(
    params.available_balance,
    'withdrawal available_balance',
    WALLET_NON_NEGATIVE_NUMBER_OPTIONS,
  ));
  const pendingTodayCount = requireNonNegativeInteger(
    params.pending_today_count,
    'withdrawal pending_today_count',
    WALLET_NON_NEGATIVE_INTEGER_OPTIONS,
  );
  const fee = Math.round(amount * rules.fee_percentage);
  const vat = Math.round(fee * rules.vat_percentage);
  const totalDeduction = fee + vat;
  const preview: WithdrawalPreview = {
    gross_amount: amount,
    fee,
    vat,
    total_deduction: totalDeduction,
    net_amount: amount - totalDeduction,
    remaining_balance: available - amount,
  };

  const errors: WithdrawalError[] = [];
  if (amount < rules.min_amount) errors.push('below_minimum');
  if (amount > Math.floor(available * rules.max_percentage)) errors.push('exceeds_maximum');
  if (amount > available) errors.push('insufficient_balance');
  if (pendingTodayCount >= rules.max_pending_per_day) errors.push('daily_limit_reached');
  if (!params.has_bank_info) errors.push('bank_info_missing');

  return { valid: errors.length === 0, errors, preview };
}
