export enum ComboTurnStatus {
  CONSUMED = 'CONSUMED',
  VOIDED = 'VOIDED',
}

export const COMBO_TURN_STATUS_VALUES = Object.values(ComboTurnStatus);

export const COMBO_TURN_ELIGIBLE_ORDER_STATUS_VALUES = [
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'REFUND_APPROVED',
  'REFUND_REJECTED',
] as const;

export type ComboTurnEligibleOrderStatus = typeof COMBO_TURN_ELIGIBLE_ORDER_STATUS_VALUES[number];

export enum ComboTurnUsageSessionSource {
  PORTAL_QR = 'PORTAL_QR',
  CUSTOMER_CODE = 'CUSTOMER_CODE',
}

export const COMBO_TURN_USAGE_SESSION_SOURCE_VALUES = Object.values(ComboTurnUsageSessionSource);

export enum ComboTurnUsageSessionStatus {
  PENDING_CUSTOMER_CONFIRMATION = 'PENDING_CUSTOMER_CONFIRMATION',
  PENDING_STAFF_CONFIRMATION = 'PENDING_STAFF_CONFIRMATION',
  CONSUMING = 'CONSUMING',
  CONSUMED = 'CONSUMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export const COMBO_TURN_USAGE_SESSION_STATUS_VALUES = Object.values(ComboTurnUsageSessionStatus);

function requireNonNegativeSafeInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative safe integer`);
  }
  return value;
}

function requirePositiveSafeInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a positive safe integer`);
  }
  return value;
}

export function isComboTurnEligibleOrderStatus(value: unknown): value is ComboTurnEligibleOrderStatus {
  return typeof value === 'string'
    && COMBO_TURN_ELIGIBLE_ORDER_STATUS_VALUES.includes(value as ComboTurnEligibleOrderStatus);
}

export function isComboTurnUsageSessionStatus(value: unknown): value is ComboTurnUsageSessionStatus {
  return typeof value === 'string' && COMBO_TURN_USAGE_SESSION_STATUS_VALUES.includes(value as ComboTurnUsageSessionStatus);
}

export function calculateEffectiveComboTurnPurchasedQuantity(
  purchasedQuantity: number,
  refundedQuantity: number,
): number {
  const normalizedPurchasedQuantity = requirePositiveSafeInteger(purchasedQuantity, 'purchasedQuantity');
  const normalizedRefundedQuantity = requireNonNegativeSafeInteger(refundedQuantity, 'refundedQuantity');
  if (normalizedRefundedQuantity > normalizedPurchasedQuantity) {
    throw new RangeError('refundedQuantity cannot exceed purchasedQuantity');
  }
  return normalizedPurchasedQuantity - normalizedRefundedQuantity;
}

export function calculateComboTurnTotalTurns(
  purchasedQuantity: number,
  componentQuantity: number,
): number {
  const normalizedPurchasedQuantity = requirePositiveSafeInteger(purchasedQuantity, 'purchasedQuantity');
  const normalizedComponentQuantity = requirePositiveSafeInteger(componentQuantity, 'componentQuantity');
  const totalTurns = normalizedPurchasedQuantity * normalizedComponentQuantity;
  if (!Number.isSafeInteger(totalTurns)) {
    throw new RangeError('totalTurns must be a safe integer');
  }
  return totalTurns;
}

export function calculateComboTurnRemainingTurns(
  totalTurns: number,
  consumedTurns: number,
): number {
  const normalizedTotalTurns = requireNonNegativeSafeInteger(totalTurns, 'totalTurns');
  const normalizedConsumedTurns = requireNonNegativeSafeInteger(consumedTurns, 'consumedTurns');
  return Math.max(0, normalizedTotalTurns - normalizedConsumedTurns);
}

export function resolveNextComboTurnSequence(
  totalTurns: number,
  consumedSequences: readonly number[],
): number | null {
  const normalizedTotalTurns = requirePositiveSafeInteger(totalTurns, 'totalTurns');
  const usedSequences = new Set<number>();
  for (const sequence of consumedSequences) {
    if (!Number.isSafeInteger(sequence) || sequence <= 0 || sequence > normalizedTotalTurns) {
      continue;
    }
    usedSequences.add(sequence);
  }
  for (let sequence = 1; sequence <= normalizedTotalTurns; sequence += 1) {
    if (!usedSequences.has(sequence)) {
      return sequence;
    }
  }
  return null;
}
