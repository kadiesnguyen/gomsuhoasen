export const LEDGER_TYPES = {
  EARN: 'earn',
  REDEEM: 'redeem',
  TRANSFER_OUT: 'transfer_out',
  TRANSFER_IN: 'transfer_in',
  WITHDRAWAL: 'withdrawal',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
} as const;

export type LedgerType = (typeof LEDGER_TYPES)[keyof typeof LEDGER_TYPES];
export const LEDGER_TYPE_VALUES = Object.values(LEDGER_TYPES);

export const LEDGER_STATUSES = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type LedgerStatus = (typeof LEDGER_STATUSES)[keyof typeof LEDGER_STATUSES];
export const LEDGER_STATUS_VALUES = Object.values(LEDGER_STATUSES);

export const BUCKET_MAPPING_STATUSES = {
  CONFIRMED: 'confirmed',
  UPDATING: 'updating',
  UNKNOWN: 'unknown',
} as const;

export type BucketMappingStatus = (typeof BUCKET_MAPPING_STATUSES)[keyof typeof BUCKET_MAPPING_STATUSES];
export const BUCKET_MAPPING_STATUS_VALUES = Object.values(BUCKET_MAPPING_STATUSES);

export function isLedgerType(input: unknown): input is LedgerType {
  return typeof input === 'string' && LEDGER_TYPE_VALUES.includes(input as LedgerType);
}

export function readLedgerType(input: unknown, fallback: LedgerType = LEDGER_TYPES.EARN): LedgerType {
  return isLedgerType(input) ? input : fallback;
}

export function isLedgerStatus(input: unknown): input is LedgerStatus {
  return typeof input === 'string' && LEDGER_STATUS_VALUES.includes(input as LedgerStatus);
}

export function readLedgerStatus(
  input: unknown,
  fallback: LedgerStatus = LEDGER_STATUSES.COMPLETED,
): LedgerStatus {
  return isLedgerStatus(input) ? input : fallback;
}

export function isBucketMappingStatus(input: unknown): input is BucketMappingStatus {
  return typeof input === 'string'
    && BUCKET_MAPPING_STATUS_VALUES.includes(input as BucketMappingStatus);
}

export function readBucketMappingStatus(
  input: unknown,
  fallback: BucketMappingStatus = BUCKET_MAPPING_STATUSES.CONFIRMED,
): BucketMappingStatus {
  return isBucketMappingStatus(input) ? input : fallback;
}

export interface IPointBucket {
  bucket_id: string;
  label: string;
  balance: number;
  usable: number;
  pending: number;
  mapping_status: BucketMappingStatus;
}

export interface IWallet {
  wallet_id: string;
  available_points: number;
  pending_points: number;
  locked_points: number;
  point_buckets: IPointBucket[];
  last_updated_at: Date;
}

export interface ILedgerRow {
  transaction_id: string;
  member_id: string;
  store_id?: string;
  type: LedgerType;
  amount: number;
  status: LedgerStatus;
  source_type: string;
  source_id: string;
  source_label: string;
  created_at: Date;
  balance_after?: number;
}
