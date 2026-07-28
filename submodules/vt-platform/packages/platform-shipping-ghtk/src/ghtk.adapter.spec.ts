import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { of } from 'rxjs';
import { GHTK_ERROR_MESSAGES, GhtkAdapter } from './ghtk.adapter';

describe('GhtkAdapter', () => {
  const adapter = new GhtkAdapter({} as never);

  it('locks carrier identity and capabilities', () => {
    assert.equal(adapter.carrierId, 'GHTK');
    assert.deepEqual(adapter.capabilities, [
      'CREATE_SHIPMENT',
      'CANCEL_SHIPMENT',
      'CALCULATE_FEE',
      'GET_LABEL',
      'TRACKING',
      'COD',
    ]);
  });

  it('normalizes webhook payloads', () => {
    const event = adapter.parseWebhookPayload({
      label_id: 'GHTK-001',
      status_id: 6,
      action_time: '2026-05-15T00:00:00.000Z',
    });

    assert.equal(event.trackingCode, 'GHTK-001');
    assert.equal(event.status, 'DELIVERED');
    assert.equal(event.carrierRawStatus, '6');
    assert.equal(event.timestamp.toISOString(), '2026-05-15T00:00:00.000Z');
  });

  it('rejects webhooks until an authoritative authentication contract exists', () => {
    assert.equal(adapter.verifyWebhookSignature({}, { label_id: 'GHTK-001' }, 'secret'), false);
  });

  it('rejects create-order responses without provider label or fee', async () => {
    const adapter = new GhtkAdapter({
      post: () => of({ data: { success: true, order: { label: '', fee: undefined } } }),
    } as never);

    await assert.rejects(
      () => adapter.createShipment({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'IDEMP-1',
        pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C', district: 'D' },
        deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'C', district: 'D' },
        weight: 1000,
        isCOD: false,
        serviceType: 'STANDARD',
        credentials: { apiToken: 'token', testMode: true },
      }),
      /GHTK order label/,
    );
  });

  it('uses constant-backed provider API error messages', async () => {
    const adapter = new GhtkAdapter({
      post: () => of({ data: { success: false, message: 'Bad order' } }),
    } as never);

    await assert.rejects(
      () => adapter.createShipment({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'IDEMP-1',
        pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C', district: 'D' },
        deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'C', district: 'D' },
        weight: 1000,
        isCOD: false,
        serviceType: 'STANDARD',
        credentials: { apiToken: 'token', testMode: true },
      }),
      (error) => error instanceof Error && error.message === GHTK_ERROR_MESSAGES.API_ERROR('Bad order'),
    );
  });
});
