import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CARRIER_IDS,
  CarrierAdapterInputError,
  CarrierAdapterNotFoundError,
  DEFAULT_SHIPMENT_DIMENSIONS,
  DEFAULT_SHIPMENT_ITEM_NAME,
  DEFAULT_SHIPMENT_NOTE,
  DEFAULT_SHIPMENT_SERVICE_TYPE,
  SHIPPING_WEIGHT_UNITS,
  DEFAULT_CARRIER_REGISTRY_DUPLICATE_POLICY,
  CarrierRegistryCore,
  SHIPPING_CORE_ERROR_MESSAGES,
  carrierApiMessage,
  carrierCaughtErrorMessage,
  gramsToKilograms,
  optionalCarrierNonNegativeNumber,
  optionalCarrierText,
  requireCarrierInteger,
  requireCarrierNonNegativeNumber,
  requireCarrierText,
  resolveShipmentDimensions,
  resolveShipmentServiceType,
  TRANSPORT_NOTIFICATION_CONFIG_STATUSES,
  TRANSPORT_TICKET_PAYMENT_METHODS,
  TRANSPORT_TICKET_PAYMENT_STATUSES,
  TRANSPORT_TICKET_STATUSES,
  type CarrierCredentials,
  type ICarrierAdapter,
  type WebhookPayload,
} from './shipping-core';

const credentials: CarrierCredentials = {
  apiToken: 'token',
  testMode: true,
};

const makeAdapter = (carrierId: ICarrierAdapter['carrierId'], capabilities: ICarrierAdapter['capabilities']): ICarrierAdapter => ({
  carrierId,
  capabilities,
  createShipment: async () => ({
    trackingCode: `${carrierId}-1`,
    shippingFee: 1000,
  }),
  cancelShipment: async () => undefined,
  getStatus: async () => ({
    trackingCode: `${carrierId}-1`,
    status: 'IN_TRANSIT',
    carrierRawStatus: 'raw',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
  }),
  calculateFee: async () => [{
    carrierId,
    serviceType: 'STANDARD',
    fee: 1000,
    currency: 'VND',
    estimatedDays: 3,
  }],
  getLabel: async () => ({
    format: 'URL',
    data: `https://example.test/${carrierId}`,
  }),
  verifyWebhookSignature: () => true,
  parseWebhookPayload: (body: WebhookPayload) => ({
    trackingCode: String(body.trackingCode ?? `${carrierId}-1`),
    status: 'IN_TRANSIT',
    carrierRawStatus: 'raw',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    rawPayload: body,
  }),
});

describe('platform-shipping-core', () => {
  it('locks the six v2 carrier ids', () => {
    assert.deepEqual(CARRIER_IDS, [
      'GHN',
      'GHTK',
      'AHAMOVE',
      'LALAMOVE',
      'VIETTEL_POST',
      'JT_EXPRESS',
    ]);
  });

  it('exposes transport ticket and notification lifecycle constants', () => {
    assert.equal(TRANSPORT_NOTIFICATION_CONFIG_STATUSES.ACCEPT, 'ACCEPT');
    assert.equal(TRANSPORT_TICKET_STATUSES.WAIT, 'WAIT');
    assert.equal(TRANSPORT_TICKET_STATUSES.COMPLETED, 'COMPLETED');
    assert.equal(TRANSPORT_TICKET_PAYMENT_STATUSES.UNPAID, 'UNPAID');
    assert.equal(TRANSPORT_TICKET_PAYMENT_METHODS.Cash_On_Delivery, 'Cash_On_Delivery');
  });

  it('registers and retrieves adapters', async () => {
    const ghn = makeAdapter('GHN', ['CREATE_SHIPMENT', 'COD']);
    const registry = new CarrierRegistryCore([ghn]);

    assert.equal(registry.has('GHN'), true);
    assert.equal(registry.get('GHN'), ghn);
    assert.deepEqual(registry.getRegisteredCarriers(), ['GHN']);
    assert.equal((await registry.get('GHN').getLabel('GHN-1', credentials)).format, 'URL');
  });

  it('filters adapters by capability', () => {
    const registry = new CarrierRegistryCore([
      makeAdapter('GHN', ['CREATE_SHIPMENT', 'COD']),
      makeAdapter('AHAMOVE', ['CREATE_SHIPMENT', 'WEBHOOK']),
    ]);

    assert.deepEqual(
      registry.getByCapability('WEBHOOK').map((adapter) => adapter.carrierId),
      ['AHAMOVE'],
    );
  });

  it('throws a typed not-found error with available ids', () => {
    const registry = new CarrierRegistryCore([makeAdapter('GHN', ['CREATE_SHIPMENT'])]);

    assert.throws(
      () => registry.get('GHTK'),
      (error) => (
        error instanceof CarrierAdapterNotFoundError
        && error.carrierId === 'GHTK'
        && error.availableCarrierIds.includes('GHN')
        && error.message === SHIPPING_CORE_ERROR_MESSAGES.CARRIER_ADAPTER_NOT_FOUND('GHTK', ['GHN'])
      ),
    );
  });

  it('can fail closed on duplicate registration when configured', () => {
    assert.throws(
      () => new CarrierRegistryCore([
        makeAdapter('GHN', ['CREATE_SHIPMENT']),
        makeAdapter('GHN', ['TRACKING']),
      ], { onDuplicate: 'throw' }),
      (error) => (
        error instanceof Error
        && error.message === SHIPPING_CORE_ERROR_MESSAGES.CARRIER_ADAPTER_ALREADY_REGISTERED('GHN')
      ),
    );
  });

  it('requires carrier fields explicitly instead of falling back to empty or zero', () => {
    assert.equal(requireCarrierText('  GHN-001  ', 'trackingCode'), 'GHN-001');
    assert.equal(requireCarrierInteger('123', 'shopId'), 123);
    assert.equal(requireCarrierNonNegativeNumber('15000', 'shippingFee'), 15000);
    assert.equal(optionalCarrierText('  warehouse a  '), 'warehouse a');
    assert.equal(optionalCarrierText('   '), undefined);
    assert.equal(optionalCarrierNonNegativeNumber(undefined, 'insuranceValue'), 0);
    assert.equal(optionalCarrierNonNegativeNumber('1000', 'insuranceValue'), 1000);

    assert.throws(
      () => requireCarrierText('', 'trackingCode'),
      (error) => (
        error instanceof CarrierAdapterInputError
        && error.fieldName === 'trackingCode'
        && error.message === SHIPPING_CORE_ERROR_MESSAGES.MISSING_OR_INVALID_CARRIER_FIELD('trackingCode')
      ),
    );
    assert.throws(
      () => requireCarrierInteger('0', 'shopId'),
      (error) => error instanceof CarrierAdapterInputError && error.fieldName === 'shopId',
    );
    assert.throws(
      () => requireCarrierNonNegativeNumber(undefined, 'shippingFee'),
      (error) => error instanceof CarrierAdapterInputError && error.fieldName === 'shippingFee',
    );
    assert.throws(
      () => optionalCarrierNonNegativeNumber(-1, 'insuranceValue'),
      (error) => error instanceof CarrierAdapterInputError && error.fieldName === 'insuranceValue',
    );
  });

  it('centralizes carrier fallback policy for adapters', () => {
    assert.equal(resolveShipmentServiceType(undefined), DEFAULT_SHIPMENT_SERVICE_TYPE);
    assert.equal(resolveShipmentServiceType('EXPRESS'), 'EXPRESS');
    assert.deepEqual(resolveShipmentDimensions(undefined), DEFAULT_SHIPMENT_DIMENSIONS);
    assert.deepEqual(resolveShipmentDimensions({ length: 1, width: 2, height: 3 }), {
      length: 1,
      width: 2,
      height: 3,
    });
    assert.equal(carrierApiMessage('  Carrier error  '), 'Carrier error');
    assert.equal(carrierApiMessage(' '), 'Unknown error');
    assert.equal(carrierCaughtErrorMessage(new Error('  network  ')), 'network');
    assert.equal(carrierCaughtErrorMessage({}), 'unknown error');
    assert.equal(DEFAULT_SHIPMENT_NOTE, 'Giao hang nhanh');
    assert.equal(DEFAULT_SHIPMENT_ITEM_NAME, 'Default Item');
    assert.equal(DEFAULT_CARRIER_REGISTRY_DUPLICATE_POLICY, 'replace');
  });

  it('centralizes carrier weight unit conversion', () => {
    assert.equal(SHIPPING_WEIGHT_UNITS.GRAMS_PER_KILOGRAM, 1000);
    assert.equal(gramsToKilograms(1500), 1.5);
  });
});
