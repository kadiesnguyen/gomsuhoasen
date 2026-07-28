export const TRANSACTION_TURN_TYPES = {
  ADMIN_DEDUCTION: 'ADMIN_DEDUCTION',
  ADMIN_ADDITION: 'ADMIN_ADDITION',
  WITHDRAWAL_REQUEST: 'WITHDRAWAL_REQUEST',
} as const;

export type TransactionTurnType = (typeof TRANSACTION_TURN_TYPES)[keyof typeof TRANSACTION_TURN_TYPES];
export const TRANSACTION_TURN_TYPE_VALUES = Object.values(TRANSACTION_TURN_TYPES);

export const TRANSACTION_TURN_STATUSES = {
  PENDING: 'PENDING',
  ACCETED: 'ACCETED',
  INPROGESS: 'INPROGESS',
  CANCELLED: 'CANCELLED',
  REJECT: 'REJECT',
  COMPLETED: 'COMPLETED',
} as const;

export type TransactionTurnStatus =
  (typeof TRANSACTION_TURN_STATUSES)[keyof typeof TRANSACTION_TURN_STATUSES];
export const TRANSACTION_TURN_STATUS_VALUES = Object.values(TRANSACTION_TURN_STATUSES);

export function isTransactionTurnType(input: unknown): input is TransactionTurnType {
  return typeof input === 'string'
    && TRANSACTION_TURN_TYPE_VALUES.includes(input as TransactionTurnType);
}

export function readTransactionTurnType(
  input: unknown,
  fallback: TransactionTurnType = TRANSACTION_TURN_TYPES.ADMIN_ADDITION,
): TransactionTurnType {
  return isTransactionTurnType(input) ? input : fallback;
}

export function isTransactionTurnStatus(input: unknown): input is TransactionTurnStatus {
  return typeof input === 'string'
    && TRANSACTION_TURN_STATUS_VALUES.includes(input as TransactionTurnStatus);
}

export function readTransactionTurnStatus(
  input: unknown,
  fallback: TransactionTurnStatus = TRANSACTION_TURN_STATUSES.PENDING,
): TransactionTurnStatus {
  return isTransactionTurnStatus(input) ? input : fallback;
}
