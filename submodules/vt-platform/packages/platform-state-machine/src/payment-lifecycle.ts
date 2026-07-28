import { assertTransition, canTransition } from './state-machine';
import type { StateMachineErrorFactory, TransitionTable } from './state-machine.types';

export const PAYMENT_LIFECYCLE_STATUSES = [
  'created',
  'pending',
  'paid',
  'expired',
  'cancelled',
  'failed',
] as const;

export type PaymentLifecycleStatus = (typeof PAYMENT_LIFECYCLE_STATUSES)[number];

export const DETAILED_PAYMENT_SESSION_STATUSES = [
  'created',
  'qr_pending',
  'points_pending',
  'paid',
  'expired',
  'cancelled',
  'failed',
] as const;

export type DetailedPaymentSessionStatus = (typeof DETAILED_PAYMENT_SESSION_STATUSES)[number];

export const PAYMENT_LIFECYCLE_TERMINAL_STATUSES = [
  'paid',
  'expired',
  'cancelled',
  'failed',
] as const satisfies readonly PaymentLifecycleStatus[];

export const DETAILED_PAYMENT_SESSION_TERMINAL_STATUSES = [
  'paid',
  'expired',
  'cancelled',
  'failed',
] as const satisfies readonly DetailedPaymentSessionStatus[];

export const DETAILED_PAYMENT_SESSION_TRANSITIONS: TransitionTable<DetailedPaymentSessionStatus> = {
  created: ['qr_pending', 'points_pending', 'cancelled'],
  qr_pending: ['paid', 'expired', 'cancelled', 'failed'],
  points_pending: ['paid', 'failed', 'cancelled'],
  paid: [],
  expired: [],
  cancelled: [],
  failed: [],
};

export const PAYMENT_LIFECYCLE_ERROR_MESSAGES = {
  UNSUPPORTED_STATUS: (input: unknown) => `Unsupported payment lifecycle status: ${String(input)}`,
} as const;

export const DETAILED_PAYMENT_SESSION_ERROR_MESSAGES = {
  UNSUPPORTED_STATUS: (input: unknown) => `Unsupported detailed payment session status: ${String(input)}`,
} as const;

export const STRICT_PAYMENT_SESSION_TRANSITIONS: TransitionTable<PaymentLifecycleStatus> = {
  created: ['pending', 'cancelled'],
  pending: ['paid', 'expired', 'cancelled', 'failed'],
  paid: [],
  expired: [],
  cancelled: [],
  failed: [],
};

export const ORDER_PAYMENT_OUTCOME_TRANSITIONS: TransitionTable<PaymentLifecycleStatus> = {
  created: ['pending', 'failed', 'cancelled'],
  pending: ['paid', 'expired', 'cancelled', 'failed'],
  paid: [],
  expired: [],
  cancelled: [],
  failed: [],
};

export interface PaymentLifecycleTransitionOptions {
  transitions?: TransitionTable<PaymentLifecycleStatus>;
  createError?: StateMachineErrorFactory<PaymentLifecycleStatus>;
}

function readPaymentLifecycleToken(input: unknown): string | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }

  const normalized = String(input).trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizePaymentLifecycleStatus(input: unknown): PaymentLifecycleStatus {
  const normalized = readPaymentLifecycleToken(input);

  switch (normalized) {
    case 'created':
    case 'unpaid':
      return 'created';
    case 'pending':
    case 'awaiting_payment':
    case 'qr_pending':
    case 'points_pending':
      return 'pending';
    case 'paid':
      return 'paid';
    case 'expired':
      return 'expired';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'failed':
      return 'failed';
    default:
      throw new Error(PAYMENT_LIFECYCLE_ERROR_MESSAGES.UNSUPPORTED_STATUS(input));
  }
}

export function normalizeDetailedPaymentSessionStatus(input: unknown): DetailedPaymentSessionStatus {
  const normalized = readPaymentLifecycleToken(input);

  switch (normalized) {
    case 'created':
    case 'qr_pending':
    case 'points_pending':
    case 'paid':
    case 'expired':
    case 'failed':
      return normalized;
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      throw new Error(DETAILED_PAYMENT_SESSION_ERROR_MESSAGES.UNSUPPORTED_STATUS(input));
  }
}

export function isTerminalPaymentLifecycleStatus(input: unknown): boolean {
  return (PAYMENT_LIFECYCLE_TERMINAL_STATUSES as readonly PaymentLifecycleStatus[])
    .includes(normalizePaymentLifecycleStatus(input));
}

export function isTerminalDetailedPaymentSessionStatus(input: unknown): boolean {
  return (DETAILED_PAYMENT_SESSION_TERMINAL_STATUSES as readonly DetailedPaymentSessionStatus[])
    .includes(normalizeDetailedPaymentSessionStatus(input));
}

export function canTransitionPaymentLifecycle(
  from: unknown,
  to: unknown,
  transitions: TransitionTable<PaymentLifecycleStatus> = STRICT_PAYMENT_SESSION_TRANSITIONS,
): boolean {
  return canTransition(
    transitions,
    normalizePaymentLifecycleStatus(from),
    normalizePaymentLifecycleStatus(to),
  );
}

export function canTransitionDetailedPaymentSession(
  from: unknown,
  to: unknown,
  transitions: TransitionTable<DetailedPaymentSessionStatus> = DETAILED_PAYMENT_SESSION_TRANSITIONS,
): boolean {
  return canTransition(
    transitions,
    normalizeDetailedPaymentSessionStatus(from),
    normalizeDetailedPaymentSessionStatus(to),
  );
}

export function assertPaymentLifecycleTransition(
  from: unknown,
  to: unknown,
  options: PaymentLifecycleTransitionOptions = {},
): void {
  assertTransition(
    {
      transitions: options.transitions ?? STRICT_PAYMENT_SESSION_TRANSITIONS,
      createError: options.createError,
    },
    normalizePaymentLifecycleStatus(from),
    normalizePaymentLifecycleStatus(to),
  );
}

export function assertDetailedPaymentSessionTransition(
  from: unknown,
  to: unknown,
  options: {
    transitions?: TransitionTable<DetailedPaymentSessionStatus>;
    createError?: StateMachineErrorFactory<DetailedPaymentSessionStatus>;
  } = {},
): void {
  assertTransition(
    {
      transitions: options.transitions ?? DETAILED_PAYMENT_SESSION_TRANSITIONS,
      createError: options.createError,
    },
    normalizeDetailedPaymentSessionStatus(from),
    normalizeDetailedPaymentSessionStatus(to),
  );
}
