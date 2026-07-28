import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { of } from 'rxjs';
import { JT_EXPRESS_ERROR_MESSAGES, JtExpressAdapter } from './jt-express.adapter';

describe('JtExpressAdapter', () => {
  const adapter = new JtExpressAdapter({} as never);

  it('locks carrier identity and capabilities', () => {
    assert.equal(adapter.carrierId, 'JT_EXPRESS');
    assert.deepEqual(adapter.capabilities, [
      'CREATE_SHIPMENT',
      'CANCEL_SHIPMENT',
      'TRACKING',
      'CALCULATE_FEE',
      'WEBHOOK',
    ]);
  });

  it('normalizes webhook payloads from logistics_interface', () => {
    const event = adapter.parseWebhookPayload({
      logistics_interface: JSON.stringify({
        mailno: 'JT-001',
        status: 'SIGNED',
        scantime: '2026-05-15T00:00:00.000Z',
        scansite: 'HCM',
      }),
    });

    assert.equal(event.trackingCode, 'JT-001');
    assert.equal(event.status, 'DELIVERED');
    assert.equal(event.carrierRawStatus, 'SIGNED');
    assert.equal(event.location, 'HCM');
  });

  it('accepts only a valid canonical logistics_interface digest', () => {
    const secret = 'secret';
    const logisticsInterface = JSON.stringify({ mailno: 'JT-001', status: 'SIGNED' });
    const digest = Buffer
      .from(createHash('md5').update(logisticsInterface + secret).digest('hex'))
      .toString('base64');

    assert.equal(
      adapter.verifyWebhookSignature(
        {},
        { data_digest: digest, logistics_interface: logisticsInterface },
        secret,
      ),
      true,
    );
    assert.equal(
      adapter.verifyWebhookSignature(
        { data_digest: digest },
        { logistics_interface: logisticsInterface },
        secret,
      ),
      false,
    );
    assert.equal(
      adapter.verifyWebhookSignature(
        {},
        { data_digest: digest, logistics_interface: { mailno: 'JT-001' } },
        secret,
      ),
      false,
    );
    assert.equal(
      adapter.verifyWebhookSignature(
        {},
        { data_digest: 'wrong', logistics_interface: logisticsInterface },
        secret,
      ),
      false,
    );
  });

  it('rejects create-order responses without tracking or fee', async () => {
    const adapter = new JtExpressAdapter({
      post: () => of({ data: { responseitems: [{ success: 'true', mailno: '', orderid: 'o1' }] } }),
    } as never);

    await assert.rejects(
      () => adapter.createShipment({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'IDEMP-1',
        pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C', district: 'D', ward: 'W', carrierWardId: 'P1' },
        deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'C', district: 'D', ward: 'W', carrierWardId: 'D1' },
        weight: 1000,
        isCOD: false,
        serviceType: 'STANDARD',
        credentials: { apiToken: 'token', shopId: 'shop-1', testMode: true },
      }),
      /J&T tracking code/,
    );
  });

  it('uses constant-backed missing create-order response messages', async () => {
    const adapter = new JtExpressAdapter({
      post: () => of({ data: { responseitems: [] } }),
    } as never);

    await assert.rejects(
      () => adapter.createShipment({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'IDEMP-1',
        pickupAddress: { recipientName: 'S', phone: '1', address: 'A', city: 'C', district: 'D', ward: 'W', carrierWardId: 'P1' },
        deliveryAddress: { recipientName: 'R', phone: '2', address: 'B', city: 'C', district: 'D', ward: 'W', carrierWardId: 'D1' },
        weight: 1000,
        isCOD: false,
        serviceType: 'STANDARD',
        credentials: { apiToken: 'token', shopId: 'shop-1', testMode: true },
      }),
      (error) => error instanceof Error && error.message === JT_EXPRESS_ERROR_MESSAGES.MISSING_CREATE_ORDER_RESPONSE_ITEM,
    );
  });
});
