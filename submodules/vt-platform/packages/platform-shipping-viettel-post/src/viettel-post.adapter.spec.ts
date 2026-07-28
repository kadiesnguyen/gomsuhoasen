import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { of } from 'rxjs';
import {
  VIETTEL_POST_ERROR_MESSAGES,
  ViettelPostAdapter,
  getViettelPostApiBaseUrl,
} from './viettel-post.adapter';

describe('ViettelPostAdapter', () => {
  const adapter = new ViettelPostAdapter({} as never);

  it('locks carrier identity and capabilities', () => {
    assert.equal(adapter.carrierId, 'VIETTEL_POST');
    assert.deepEqual(adapter.capabilities, [
      'CREATE_SHIPMENT',
      'CANCEL_SHIPMENT',
      'CALCULATE_FEE',
      'TRACKING',
      'COD',
    ]);
  });

  it('exports canonical API base URL selector', () => {
    assert.equal(getViettelPostApiBaseUrl(true), 'https://partnerdev.viettelpost.vn');
    assert.equal(getViettelPostApiBaseUrl(false), 'https://partner.viettelpost.vn');
  });

  it('normalizes webhook payloads', () => {
    const event = adapter.parseWebhookPayload({
      ORDER_NUMBER: 'VTP-001',
      ORDER_STATUS: 500,
      ORDER_STATUSDATE: '2026-05-15T00:00:00.000Z',
      LOCATION: 'HCM',
    });

    assert.equal(event.trackingCode, 'VTP-001');
    assert.equal(event.status, 'DELIVERED');
    assert.equal(event.carrierRawStatus, '500');
    assert.equal(event.location, 'HCM');
  });

  it('rejects webhooks until an authoritative authentication contract exists', () => {
    assert.equal(adapter.verifyWebhookSignature({}, { ORDER_NUMBER: 'VTP-001' }, 'secret'), false);
  });

  it('rejects create-order responses without provider fee total', async () => {
    const adapter = new ViettelPostAdapter({
      post: () => of({ data: { status: 200, data: { ORDER_NUMBER: 'VTP-001' } } }),
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
        credentials: { apiToken: 'token', shopId: '123', testMode: true },
      }),
      /ViettelPost create-order money total/,
    );
  });

  it('uses constant-backed provider API error messages', async () => {
    const adapter = new ViettelPostAdapter({
      post: () => of({ data: { status: 400, message: 'Bad order', data: {} } }),
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
        credentials: { apiToken: 'token', shopId: '123', testMode: true },
      }),
      (error) => error instanceof Error && error.message === VIETTEL_POST_ERROR_MESSAGES.API_ERROR('Bad order'),
    );
  });
});
