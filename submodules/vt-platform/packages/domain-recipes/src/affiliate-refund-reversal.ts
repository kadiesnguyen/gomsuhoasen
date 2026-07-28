export type AffiliateRefundReversalType = 'FULL' | 'PARTIAL';

export interface AffiliateRefundReversalInput {
  refundType: AffiliateRefundReversalType;
  finalAmount: unknown;
  reversedAmount: unknown;
  refundAmount: unknown;
  orderAmount: unknown;
  previousCarry: unknown;
}

export interface AffiliateRefundReversalDecision {
  amount: number;
  carry: number;
  finalAmount: number;
  currentReversedAmount: number;
  nextReversedAmount: number;
  fullyReversed: boolean;
}

const REFUND_CARRY_TOKEN_PATTERN = /\[refundCarry:(\d+)\]/;
const REFUND_CARRY_TOKEN_MARKER = '[refundCarry:';

export const AFFILIATE_REFUND_REVERSAL_MESSAGES = {
  FINITE_NON_NEGATIVE_NUMBER: 'must be a finite non-negative number',
  FIELD_FINITE_NON_NEGATIVE_NUMBER: (fieldName: string) => (
    `${fieldName} must be a finite non-negative number`
  ),
  SAFE_INTEGER_AMOUNT: 'must be a safe integer amount',
  FIELD_SAFE_INTEGER_AMOUNT: (fieldName: string) => `${fieldName} must be a safe integer amount`,
  CARRY_SAFE_NON_NEGATIVE_INTEGER: 'affiliate refund carry must be a safe non-negative integer',
  CARRY_TOKEN_INVALID: 'affiliate refund carry token is invalid',
  REVERSED_EXCEEDS_FINAL: 'affiliate refund reversed amount exceeds final amount',
  REFUND_TYPE_INVALID: 'affiliate refund type is invalid',
  ORDER_AMOUNT_GREATER_THAN_ZERO: 'affiliate refund order amount must be greater than zero',
} as const;

function requireNonNegativeSafeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(AFFILIATE_REFUND_REVERSAL_MESSAGES.FIELD_FINITE_NON_NEGATIVE_NUMBER(fieldName));
  }

  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded)) {
    throw new Error(AFFILIATE_REFUND_REVERSAL_MESSAGES.FIELD_SAFE_INTEGER_AMOUNT(fieldName));
  }

  return rounded;
}

function requireNonNegativeCarry(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(AFFILIATE_REFUND_REVERSAL_MESSAGES.CARRY_SAFE_NON_NEGATIVE_INTEGER);
  }

  return value;
}

function parseAffiliateRefundCarryToken(reason: string): number | undefined {
  const match = reason.match(REFUND_CARRY_TOKEN_PATTERN);
  if (match) {
    return requireNonNegativeCarry(Number(match[1]));
  }

  if (reason.includes(REFUND_CARRY_TOKEN_MARKER)) {
    throw new Error(AFFILIATE_REFUND_REVERSAL_MESSAGES.CARRY_TOKEN_INVALID);
  }

  return undefined;
}

export function buildAffiliateRefundCarryToken(carry: unknown): string {
  return `[refundCarry:${requireNonNegativeCarry(carry)}]`;
}

export function readLatestAffiliateRefundCarry(reasons: Array<string | undefined>): number {
  for (let index = reasons.length - 1; index >= 0; index -= 1) {
    const reason = reasons[index];
    if (typeof reason !== 'string') {
      continue;
    }

    const parsed = parseAffiliateRefundCarryToken(reason);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  return 0;
}

export function calculateAffiliateRefundReversal(input: AffiliateRefundReversalInput): AffiliateRefundReversalDecision {
  const finalAmount = requireNonNegativeSafeInteger(input.finalAmount, 'affiliate refund final amount');
  const currentReversedAmount = requireNonNegativeSafeInteger(input.reversedAmount, 'affiliate refund reversed amount');
  const previousCarry = requireNonNegativeCarry(input.previousCarry);

  if (currentReversedAmount > finalAmount) {
    throw new Error(AFFILIATE_REFUND_REVERSAL_MESSAGES.REVERSED_EXCEEDS_FINAL);
  }

  const outstandingAmount = finalAmount - currentReversedAmount;
  if (outstandingAmount === 0) {
    return {
      amount: 0,
      carry: 0,
      finalAmount,
      currentReversedAmount,
      nextReversedAmount: currentReversedAmount,
      fullyReversed: true,
    };
  }

  if (input.refundType === 'FULL') {
    return {
      amount: outstandingAmount,
      carry: 0,
      finalAmount,
      currentReversedAmount,
      nextReversedAmount: finalAmount,
      fullyReversed: true,
    };
  }

  if (input.refundType !== 'PARTIAL') {
    throw new Error(AFFILIATE_REFUND_REVERSAL_MESSAGES.REFUND_TYPE_INVALID);
  }

  const refundAmount = requireNonNegativeSafeInteger(input.refundAmount, 'affiliate refund amount');
  if (refundAmount === 0) {
    return {
      amount: 0,
      carry: previousCarry,
      finalAmount,
      currentReversedAmount,
      nextReversedAmount: currentReversedAmount,
      fullyReversed: false,
    };
  }

  const orderAmount = requireNonNegativeSafeInteger(input.orderAmount, 'affiliate refund order amount');
  if (orderAmount <= 0) {
    throw new Error(AFFILIATE_REFUND_REVERSAL_MESSAGES.ORDER_AMOUNT_GREATER_THAN_ZERO);
  }

  const totalNumerator =
    BigInt(previousCarry) +
    BigInt(refundAmount) * BigInt(finalAmount);
  const quotient = totalNumerator / BigInt(orderAmount);
  const nextCarry = Number(totalNumerator % BigInt(orderAmount));
  const requestedAmount = Number(quotient);
  const amount = requestedAmount > outstandingAmount ? outstandingAmount : requestedAmount;
  const nextReversedAmount = currentReversedAmount + amount;
  const fullyReversed = nextReversedAmount >= finalAmount;

  return {
    amount,
    carry: fullyReversed ? 0 : nextCarry,
    finalAmount,
    currentReversedAmount,
    nextReversedAmount,
    fullyReversed,
  };
}
