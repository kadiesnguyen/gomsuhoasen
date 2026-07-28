import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { of, throwError } from 'rxjs';
import {
  GHN_ERROR_MESSAGES,
  GhnAdapter,
  GhnCarrierError,
  getGhnApiBaseUrl,
} from './ghn.adapter';

const mockCredentials = {
  apiToken: 'test-token',
  shopId: '123456',
  testMode: true,
};

function createAdapter(post: (url: string, payload: unknown, options: unknown) => unknown) {
  return new GhnAdapter({ post } as any);
}

describe('GhnAdapter', () => {
  it('rejects webhooks until an authoritative authentication contract exists', () => {
    const adapter = createAdapter(() => of({}));
    assert.equal(adapter.verifyWebhookSignature({}, { OrderCode: 'GHN-001' }, 'secret'), false);
  });

  it('exports canonical API base URL selector', () => {
    assert.equal(getGhnApiBaseUrl(true), 'https://dev-online-gateway.ghn.vn');
    assert.equal(getGhnApiBaseUrl(false), 'https://online-gateway.ghn.vn');
  });

  it('creates a shipment with GHN create-order endpoint', async () => {
    const calls: unknown[][] = [];
    const adapter = createAdapter((...args) => {
      calls.push(args);
      return of({
        data: {
          code: 200,
          data: {
            order_code: 'GHN123',
            client_order_code: 'IDEMP-1',
            total_fee: 15000,
            expected_delivery_time: '2026-03-05T10:00:00Z',
          },
        },
      });
    });

    const result = await adapter.createShipment({
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'IDEMP-1',
      pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C' },
      deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'D', districtCode: '2', wardCode: 'W1' },
      weight: 500,
      isCOD: true,
      codAmount: 100000,
      serviceType: 'STANDARD',
      credentials: mockCredentials,
    });

    assert.equal(result.trackingCode, 'GHN123');
    assert.equal(result.shippingFee, 15000);
    assert.match(calls[0][0] as string, /\/v2\/shipping-order\/create$/);
    assert.equal((calls[0][1] as { client_order_code: string }).client_order_code, 'IDEMP-1');
  });

  it('uses configured error factory for carrier API errors', async () => {
    const adapter = new GhnAdapter(
      { post: () => of({ data: { code: 400, message: 'Invalid address' } }) } as any,
      { createError: (message) => new TypeError(message) },
    );

    await assert.rejects(
      () => adapter.createShipment({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'IDEMP-1',
        pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C' },
        deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'D', districtCode: '2', wardCode: 'W1' },
        weight: 500,
        isCOD: false,
        serviceType: 'STANDARD',
        credentials: mockCredentials,
      }),
      (error) => error instanceof TypeError && error.message === GHN_ERROR_MESSAGES.API_ERROR('Invalid address'),
    );
  });

  it('throws GhnCarrierError by default', async () => {
    const adapter = new GhnAdapter(
      { post: () => of({ data: { code: 400, message: 'Invalid address' } }) } as any,
    );

    await assert.rejects(
      () => adapter.cancelShipment('GHN123', mockCredentials),
      (error) => (
        error instanceof GhnCarrierError
        && error.message === GHN_ERROR_MESSAGES.CANCEL_ERROR('Invalid address')
      ),
    );
  });

  it('maps status responses', async () => {
    const adapter = createAdapter(() => of({
      data: {
        code: 200,
        data: { status: 'ready_to_pick', order_code: 'GHN123' },
      },
    }));

    const result = await adapter.getStatus('GHN123', mockCredentials);
    assert.equal(result.status, 'READY_TO_SHIP');
  });

  it('returns empty fee list when fee API throws', async () => {
    const adapter = createAdapter(() => throwError(() => new Error('network')));

    const result = await adapter.calculateFee({
      pickupAddress: { recipientName: '', phone: '', address: '', city: '', districtCode: '1' },
      deliveryAddress: { recipientName: '', phone: '', address: '', city: '', districtCode: '2', wardCode: 'W1' },
      weight: 1000,
      isCOD: false,
      credentials: mockCredentials,
    });

    assert.deepEqual(result, []);
  });

  it('rejects missing provider address codes before carrier calls', async () => {
    let called = false;
    const adapter = createAdapter(() => {
      called = true;
      return of({ data: { code: 200, data: { order_code: 'GHN123', client_order_code: 'IDEMP-1', total_fee: 1 } } });
    });

    await assert.rejects(
      () => adapter.createShipment({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'IDEMP-1',
        pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C' },
        deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'D', districtCode: '2' },
        weight: 500,
        isCOD: false,
        serviceType: 'STANDARD',
        credentials: mockCredentials,
      }),
      /GHN delivery ward code/,
    );

    assert.equal(called, false);
  });
});
