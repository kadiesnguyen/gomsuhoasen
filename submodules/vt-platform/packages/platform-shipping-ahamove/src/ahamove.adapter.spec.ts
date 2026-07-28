import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { of } from 'rxjs';
import { AHAMOVE_ERROR_MESSAGES, AhamoveAdapter } from './ahamove.adapter';

describe('AhamoveAdapter', () => {
  const adapter = new AhamoveAdapter({} as never);

  it('locks carrier identity and capabilities', () => {
    assert.equal(adapter.carrierId, 'AHAMOVE');
    assert.deepEqual(adapter.capabilities, [
      'CREATE_SHIPMENT',
      'CANCEL_SHIPMENT',
      'CALCULATE_FEE',
      'TRACKING',
    ]);
  });

  it('normalizes webhook payloads', () => {
    const event = adapter.parseWebhookPayload({
      order_id: 'AHAMOVE-001',
      status: 'COMPLETED',
    });

    assert.equal(event.trackingCode, 'AHAMOVE-001');
    assert.equal(event.status, 'DELIVERED');
    assert.equal(event.carrierRawStatus, 'COMPLETED');
  });

  it('rejects webhooks until an authoritative authentication contract exists', () => {
    assert.equal(adapter.verifyWebhookSignature({}, { order_id: 'AHAMOVE-001' }, 'secret'), false);
  });

  it('rejects create-order responses without provider fee total', async () => {
    const adapter = new AhamoveAdapter({
      post: () => of({ status: 201, data: { order_id: 'AHAMOVE-001' } }),
    } as never);

    await assert.rejects(
      () => adapter.createShipment({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'IDEMP-1',
        pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C' },
        deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'C' },
        weight: 1000,
        isCOD: false,
        serviceType: 'STANDARD',
        credentials: { apiToken: 'token', testMode: true },
      }),
      /Ahamove create-order total fee/,
    );
  });

  it('uses constant-backed provider API error messages', async () => {
    const adapter = new AhamoveAdapter({
      post: () => of({ status: 400, data: { message: 'Bad route' } }),
    } as never);

    await assert.rejects(
      () => adapter.createShipment({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'IDEMP-1',
        pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C' },
        deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'C' },
        weight: 1000,
        isCOD: false,
        serviceType: 'STANDARD',
        credentials: { apiToken: 'token', testMode: true },
      }),
      (error) => error instanceof Error && error.message === AHAMOVE_ERROR_MESSAGES.API_ERROR('Bad route'),
    );
  });
});
