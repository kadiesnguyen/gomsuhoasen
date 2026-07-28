import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DETAILED_PAYMENT_SESSION_ERROR_MESSAGES,
  DETAILED_PAYMENT_SESSION_TRANSITIONS,
  ORDER_PAYMENT_OUTCOME_TRANSITIONS,
  PAYMENT_LIFECYCLE_ERROR_MESSAGES,
  assertDetailedPaymentSessionTransition,
  assertPaymentLifecycleTransition,
  canTransitionDetailedPaymentSession,
  canTransitionPaymentLifecycle,
  isTerminalDetailedPaymentSessionStatus,
  isTerminalPaymentLifecycleStatus,
  normalizeDetailedPaymentSessionStatus,
  normalizePaymentLifecycleStatus,
} from './payment-lifecycle';
import { STATE_MACHINE_ERROR_MESSAGES } from './state-machine';

describe('platform-state-machine payment lifecycle helpers', () => {
  it('normalizes VITA detailed payment session statuses into a common lifecycle', () => {
    assert.equal(normalizePaymentLifecycleStatus('created'), 'created');
    assert.equal(normalizePaymentLifecycleStatus('qr_pending'), 'pending');
    assert.equal(normalizePaymentLifecycleStatus('points_pending'), 'pending');
    assert.equal(normalizePaymentLifecycleStatus('paid'), 'paid');
  });

  it('normalizes v2 order payment statuses into the same lifecycle', () => {
    assert.equal(normalizePaymentLifecycleStatus('UNPAID'), 'created');
    assert.equal(normalizePaymentLifecycleStatus('AWAITING_PAYMENT'), 'pending');
    assert.equal(normalizePaymentLifecycleStatus('PAID'), 'paid');
    assert.equal(normalizePaymentLifecycleStatus('FAILED'), 'failed');
  });

  it('rejects missing or blank lifecycle statuses explicitly', () => {
    assert.throws(
      () => normalizePaymentLifecycleStatus(undefined),
      { message: PAYMENT_LIFECYCLE_ERROR_MESSAGES.UNSUPPORTED_STATUS(undefined) },
    );
    assert.throws(
      () => normalizePaymentLifecycleStatus(null),
      { message: PAYMENT_LIFECYCLE_ERROR_MESSAGES.UNSUPPORTED_STATUS(null) },
    );
    assert.throws(
      () => normalizePaymentLifecycleStatus('   '),
      { message: PAYMENT_LIFECYCLE_ERROR_MESSAGES.UNSUPPORTED_STATUS('   ') },
    );
  });

  it('keeps strict payment sessions from jumping directly to paid or failed', () => {
    assert.equal(canTransitionPaymentLifecycle('created', 'qr_pending'), true);
    assert.equal(canTransitionPaymentLifecycle('created', 'paid'), false);
    assert.equal(canTransitionPaymentLifecycle('created', 'failed'), false);
    assert.doesNotThrow(() => assertPaymentLifecycleTransition('qr_pending', 'paid'));
    assert.throws(
      () => assertPaymentLifecycleTransition('created', 'failed'),
      { message: STATE_MACHINE_ERROR_MESSAGES.INVALID_TRANSITION({ from: 'created', to: 'failed' }) },
    );
  });

  it('allows order payment outcome timeout semantics without weakening strict sessions', () => {
    assert.equal(
      canTransitionPaymentLifecycle('UNPAID', 'FAILED', ORDER_PAYMENT_OUTCOME_TRANSITIONS),
      true,
    );
    assert.equal(
      canTransitionPaymentLifecycle('AWAITING_PAYMENT', 'PAID', ORDER_PAYMENT_OUTCOME_TRANSITIONS),
      true,
    );
    assert.equal(
      canTransitionPaymentLifecycle('PAID', 'FAILED', ORDER_PAYMENT_OUTCOME_TRANSITIONS),
      false,
    );
  });

  it('preserves detailed VITA payment session transitions', () => {
    assert.equal(normalizeDetailedPaymentSessionStatus('qr_pending'), 'qr_pending');
    assert.equal(normalizeDetailedPaymentSessionStatus('points_pending'), 'points_pending');
    assert.equal(canTransitionDetailedPaymentSession('created', 'qr_pending'), true);
    assert.equal(canTransitionDetailedPaymentSession('created', 'points_pending'), true);
    assert.equal(canTransitionDetailedPaymentSession('qr_pending', 'expired'), true);
    assert.equal(canTransitionDetailedPaymentSession('points_pending', 'expired'), false);
    assert.equal(canTransitionDetailedPaymentSession('created', 'paid'), false);
    assert.doesNotThrow(() => assertDetailedPaymentSessionTransition('points_pending', 'paid'));
    assert.throws(
      () => assertDetailedPaymentSessionTransition('points_pending', 'expired'),
      { message: STATE_MACHINE_ERROR_MESSAGES.INVALID_TRANSITION({ from: 'points_pending', to: 'expired' }) },
    );
    assert.deepEqual(DETAILED_PAYMENT_SESSION_TRANSITIONS.points_pending, ['paid', 'failed', 'cancelled']);
  });

  it('rejects unsupported detailed payment session statuses explicitly', () => {
    assert.throws(
      () => normalizeDetailedPaymentSessionStatus('pending'),
      { message: DETAILED_PAYMENT_SESSION_ERROR_MESSAGES.UNSUPPORTED_STATUS('pending') },
    );
  });

  it('classifies terminal payment lifecycle states', () => {
    assert.equal(isTerminalPaymentLifecycleStatus('PAID'), true);
    assert.equal(isTerminalPaymentLifecycleStatus('FAILED'), true);
    assert.equal(isTerminalPaymentLifecycleStatus('AWAITING_PAYMENT'), false);
    assert.equal(isTerminalDetailedPaymentSessionStatus('paid'), true);
    assert.equal(isTerminalDetailedPaymentSessionStatus('qr_pending'), false);
  });
});
