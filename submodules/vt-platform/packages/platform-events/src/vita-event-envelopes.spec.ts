import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildVitaCommissionEventEnvelope,
  buildVitaOrderEventEnvelope,
  buildVitaRankUpgradeEventEnvelope,
} from './vita-event-envelopes';

describe('Vita event envelopes', () => {
  it('builds order payload and metadata with payment-session correlation', () => {
    const envelope = buildVitaOrderEventEnvelope('vita', {
      orderId: 'ord_001',
      orderNumber: 'VITA-2026-ABC123',
      memberId: 'mem_001',
      memberLevel: 3,
      status: 'pending_payment',
      paymentStatus: 'qr_pending',
      paymentSessionId: 'PS-ORDER-1',
      orderAmount: 250000,
      pointsRedeemed: 50000,
    });

    assert.deepEqual(envelope, {
      payload: {
        orderId: 'ord_001',
        orderNumber: 'VITA-2026-ABC123',
        memberId: 'mem_001',
        memberLevel: 3,
        status: 'pending_payment',
        paymentStatus: 'qr_pending',
        paymentSessionId: 'PS-ORDER-1',
        orderAmount: 250000,
        pointsRedeemed: 50000,
      },
      metadata: {
        tenantId: 'vita',
        aggregateType: 'order',
        aggregateId: 'ord_001',
        correlationId: 'PS-ORDER-1',
      },
    });
  });

  it('falls back to record identifiers when payment session is missing', () => {
    const orderEnvelope = buildVitaOrderEventEnvelope('vita', {
      orderId: 'ord_002',
      orderNumber: 'VITA-2026-XYZ789',
      memberId: 'mem_002',
      status: 'paid',
      paymentStatus: 'paid',
      orderAmount: 180000,
    });
    const rankEnvelope = buildVitaRankUpgradeEventEnvelope('vita', {
      upgradeCode: 'RU-123456',
      memberId: 'mem_003',
      currentLevel: 2,
      targetLevel: 3,
      status: 'paid',
      amountDue: 137500,
      method: 'vietqr',
    });

    assert.deepEqual(orderEnvelope, {
      payload: {
        orderId: 'ord_002',
        orderNumber: 'VITA-2026-XYZ789',
        memberId: 'mem_002',
        memberLevel: 1,
        status: 'paid',
        paymentStatus: 'paid',
        paymentSessionId: undefined,
        orderAmount: 180000,
        pointsRedeemed: 0,
      },
      metadata: {
        tenantId: 'vita',
        aggregateType: 'order',
        aggregateId: 'ord_002',
        correlationId: 'ord_002',
      },
    });
    assert.deepEqual(rankEnvelope, {
      payload: {
        upgradeCode: 'RU-123456',
        memberId: 'mem_003',
        currentLevel: 2,
        targetLevel: 3,
        status: 'paid',
        paymentSessionId: undefined,
        amountDue: 137500,
        method: 'vietqr',
      },
      metadata: {
        tenantId: 'vita',
        aggregateType: 'rank_upgrade',
        aggregateId: 'RU-123456',
        correlationId: 'RU-123456',
      },
    });
  });

  it('builds commission payload and metadata from the same application scope builder', () => {
    const envelope = buildVitaCommissionEventEnvelope('vita', {
      orderId: 'ord_003',
      memberId: 'mem_004',
      ledgerCount: 2,
      totalCommission: 170000,
      correlationId: 'corr-commission-1',
    });

    assert.deepEqual(envelope, {
      payload: {
        orderId: 'ord_003',
        memberId: 'mem_004',
        ledgerCount: 2,
        totalCommission: 170000,
      },
      metadata: {
        tenantId: 'vita',
        aggregateType: 'commission',
        aggregateId: 'ord_003',
        correlationId: 'corr-commission-1',
      },
    });
  });
});
