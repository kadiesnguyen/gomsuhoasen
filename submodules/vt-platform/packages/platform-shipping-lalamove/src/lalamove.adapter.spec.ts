import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { of } from 'rxjs';
import { LALAMOVE_ERROR_MESSAGES, LalamoveAdapter } from './lalamove.adapter';

describe('LalamoveAdapter', () => {
  const adapter = new LalamoveAdapter({} as never);

  it('locks carrier identity and capabilities', () => {
    assert.equal(adapter.carrierId, 'LALAMOVE');
    assert.deepEqual(adapter.capabilities, [
      'CREATE_SHIPMENT',
      'CANCEL_SHIPMENT',
      'CALCULATE_FEE',
      'TRACKING',
    ]);
  });

  it('normalizes nested webhook payloads', () => {
    const event = adapter.parseWebhookPayload({
      data: {
        orderId: 'LALA-001',
        status: 'COMPLETED',
      },
    });

    assert.equal(event.trackingCode, 'LALA-001');
    assert.equal(event.status, 'DELIVERED');
    assert.equal(event.carrierRawStatus, 'COMPLETED');
  });

  it('rejects webhooks until an authoritative inbound authentication contract exists', () => {
    assert.equal(
      adapter.verifyWebhookSignature(
        { authorization: 'hmac unverified-contract' },
        { orderId: 'LALA-001', status: 'COMPLETED' },
        'secret',
      ),
      false,
    );
  });

  it('rejects quotation responses without both stop ids', async () => {
    const adapter = new LalamoveAdapter({
      post: () => of({
        status: 201,
        data: {
          data: {
            quotationId: 'Q1',
            stops: [{ stopId: 'S1' }, { stopId: '' }],
            price: { amount: '20000', currency: 'VND' },
          },
        },
      }),
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
        credentials: { apiToken: 'token', apiSecret: 'secret', market: 'VN', testMode: true },
      }),
      /Lalamove receiver stop id/,
    );
  });

  it('uses constant-backed quote error messages', async () => {
    const adapter = new LalamoveAdapter({
      post: () => of({ status: 400, data: { message: 'No route' } }),
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
        credentials: { apiToken: 'token', apiSecret: 'secret', market: 'VN', testMode: true },
      }),
      (error) => error instanceof Error && error.message === LALAMOVE_ERROR_MESSAGES.QUOTE_ERROR('No route'),
    );
  });
});
