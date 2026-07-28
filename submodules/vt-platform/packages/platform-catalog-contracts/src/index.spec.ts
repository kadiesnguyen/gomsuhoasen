import { describe, expect, it } from 'vitest';

import {
  projectCatalogProductIngress,
  projectCatalogVariantIngress,
  readCatalogExpectedVersion,
  readCatalogExternalProductId,
} from './index.js';

describe('platform catalog contracts', () => {
  it('projects native and marketplace product aliases into one ingress shape', () => {
    expect(projectCatalogProductIngress({
      sProductId: ' SP-1001 ',
      name: ' Shopee Coffee ',
      salePrice: '125000',
      stock: '12',
      externalUpdatedAt: '2026-07-20T00:00:00.000Z',
      aliases: ['coffee', 'Coffee', ' arabica '],
    }, {
      externalSource: 'shopee',
      currency: 'vnd',
      status: 'active',
    })).toEqual({
      externalSource: 'SHOPEE',
      externalSourceId: 'SP-1001',
      channelAccountId: undefined,
      sourceVersion: undefined,
      sourceUpdatedAt: '2026-07-20T00:00:00.000Z',
      sourceCursor: undefined,
      name: 'Shopee Coffee',
      sku: undefined,
      description: undefined,
      price: 125000,
      currency: 'VND',
      stockQuantity: 12,
      status: 'ACTIVE',
      images: [],
      tags: [],
      searchAliases: ['coffee', 'arabica'],
      categoryNames: [],
    });
  });

  it('supports legacy product and variant identity aliases without provider code', () => {
    expect(readCatalogExternalProductId({ misaProductId: 'MISA-1' })).toBe('MISA-1');
    expect(projectCatalogVariantIngress({
      sVariationId: 'SV-1',
      salePrice: '99000',
      stock: '4',
      options: { Color: ' Red ', Empty: '' },
    })).toEqual({
      externalVariantId: 'SV-1',
      sku: undefined,
      name: undefined,
      optionValues: { Color: 'Red' },
      price: 99000,
      stockQuantity: 4,
      weight: undefined,
      isActive: undefined,
    });
  });

  it('accepts only strict positive safe optimistic versions', () => {
    expect(readCatalogExpectedVersion(4)).toBe(4);
    expect(readCatalogExpectedVersion('5')).toBe(5);
    expect(readCatalogExpectedVersion(0)).toBeUndefined();
    expect(readCatalogExpectedVersion('1.5')).toBeUndefined();
    expect(readCatalogExpectedVersion(Number.MAX_SAFE_INTEGER + 1)).toBeUndefined();
  });
});
