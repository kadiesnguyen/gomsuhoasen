export const WITHDRAWAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[keyof typeof WITHDRAWAL_STATUSES];
export const WITHDRAWAL_STATUS_VALUES = Object.values(WITHDRAWAL_STATUSES);
export const WITHDRAWAL_INITIAL_STATUS =
  WITHDRAWAL_STATUSES.PENDING satisfies WithdrawalStatus;

export const WITHDRAWAL_CONTEXT_TYPES = {
  PERSONAL: 'personal',
  STORE: 'store',
} as const;

export type WithdrawalContextType =
  (typeof WITHDRAWAL_CONTEXT_TYPES)[keyof typeof WITHDRAWAL_CONTEXT_TYPES];
export const WITHDRAWAL_CONTEXT_TYPE_VALUES = Object.values(WITHDRAWAL_CONTEXT_TYPES);

export function isWithdrawalStatus(input: unknown): input is WithdrawalStatus {
  return typeof input === 'string'
    && WITHDRAWAL_STATUS_VALUES.includes(input as WithdrawalStatus);
}

export function readWithdrawalStatus(
  input: unknown,
  fallback: WithdrawalStatus = WITHDRAWAL_INITIAL_STATUS,
): WithdrawalStatus {
  return isWithdrawalStatus(input) ? input : fallback;
}

export function isWithdrawalContextType(input: unknown): input is WithdrawalContextType {
  return typeof input === 'string'
    && WITHDRAWAL_CONTEXT_TYPE_VALUES.includes(input as WithdrawalContextType);
}

export function readWithdrawalContextType(
  input: unknown,
  fallback: WithdrawalContextType = WITHDRAWAL_CONTEXT_TYPES.PERSONAL,
): WithdrawalContextType {
  return isWithdrawalContextType(input) ? input : fallback;
}

export interface IBankSnapshot {
  bank_name: string;
  account_number_masked: string;
  holder_name: string;
}

export interface IWithdrawalRequest {
  request_id: string;
  member_id: string;
  context_type: WithdrawalContextType;
  store_id?: string;
  amount: number;
  fee: number;
  vat?: number;
  net_amount: number;
  status: WithdrawalStatus;
  rejection_reason?: string;
  bank_snapshot: IBankSnapshot;
  created_at: Date;
}
