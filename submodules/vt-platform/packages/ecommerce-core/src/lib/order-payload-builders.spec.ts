import {
  buildInventoryReservationLines,
  buildInventoryLifecycleLines,
  buildInventoryReleaseLines,
  buildOrderEventPayload,
  buildOrderTimelineEntry,
  PayloadBuilderError,
} from './order-payload-builders';

describe('order-payload-builders', () => {
  describe('buildInventoryReservationLines', () => {
    it('builds reservation lines for simple items', () => {
      const items = [
        {
          _id: 'item1',
          productId: 'prod1',
          qty: 2,
        },
      ];
      const lines = buildInventoryReservationLines('order1', items, {
        requireParentProductId: true,
      });

      expect(lines).toEqual([
        {
          orderLineId: 'item1',
          productId: 'prod1',
          parentProductId: 'prod1',
          quantity: 2,
          inventoryLineType: 'ORDER_ITEM',
        },
      ]);
    });

    it('builds reservation lines with commercial fields', () => {
      const items = [
        {
          id: 'item1',
          productId: 'prod1',
          qty: 2,
          sku: 'sku1',
          price: 100,
        },
      ];
      const lines = buildInventoryReservationLines('order1', items, {
        includeCommercialFields: true,
        requireParentProductId: true,
      });

      expect(lines).toEqual([
        {
          orderLineId: 'item1',
          productId: 'prod1',
          parentProductId: 'prod1',
          quantity: 2,
          inventoryLineType: 'ORDER_ITEM',
          sku: 'sku1',
          price: 100,
        },
      ]);
    });

    it('unpacks combo items correctly', () => {
      const items = [
        {
          _id: 'item1',
          productId: 'comboProd1',
          qty: 2,
          comboItems: [
            { productId: 'sub1', quantity: 3 },
            { productId: 'sub2', quantity: 1 },
          ],
        },
      ];
      const lines = buildInventoryReservationLines('order1', items);

      expect(lines).toEqual([
        {
          orderLineId: 'item1:component:0:sub1',
          productId: 'sub1',
          parentOrderLineId: 'item1',
          parentProductId: 'comboProd1',
          quantity: 6, // 2 * 3
          inventoryLineType: 'COMBO_COMPONENT',
        },
        {
          orderLineId: 'item1:component:1:sub2',
          productId: 'sub2',
          parentOrderLineId: 'item1',
          parentProductId: 'comboProd1',
          quantity: 2, // 2 * 1
          inventoryLineType: 'COMBO_COMPONENT',
        },
      ]);
    });

    it('throws error if required fields are missing', () => {
      const items = [
        {
          _id: undefined, // Missing ID
          productId: 'prod1',
          qty: 2,
        },
      ];
      expect(() => buildInventoryReservationLines('order1', items)).toThrow(PayloadBuilderError);
    });
  });

  describe('buildInventoryLifecycleLines', () => {
    it('builds lifecycle lines without commercial fields', () => {
      const items = [
        {
          _id: 'item1',
          productId: 'prod1',
          qty: 2,
          sku: 'sku1',
          price: 100,
        },
      ];
      const lines = buildInventoryLifecycleLines('order1', items);

      expect(lines).toEqual([
        {
          orderLineId: 'item1',
          productId: 'prod1',
          parentProductId: 'prod1',
          quantity: 2,
          inventoryLineType: 'ORDER_ITEM',
        },
      ]);
      expect(lines[0]).not.toHaveProperty('sku');
      expect(lines[0]).not.toHaveProperty('price');
    });
  });

  describe('buildInventoryReleaseLines', () => {
    it('builds compact release lines for simple items', () => {
      const items = [
        {
          lineId: ' item1 ',
          productId: 'prod1',
          qty: 2,
        },
      ];

      const lines = buildInventoryReleaseLines('order1', items);

      expect(lines).toEqual([
        {
          orderLineId: 'item1',
          quantity: 2,
        },
      ]);
    });

    it('keeps combo component metadata for release lines', () => {
      const items = [
        {
          lineId: ' combo-parent ',
          productId: ' combo1 ',
          qty: 2,
          comboItems: [
            { productId: { _id: ' component-a ' }, quantity: 3 },
          ],
        },
      ];

      const lines = buildInventoryReleaseLines('order1', items);

      expect(lines).toEqual([
        {
          orderLineId: 'combo-parent:component:0:component-a',
          productId: 'component-a',
          quantity: 6,
          parentOrderLineId: 'combo-parent',
          parentProductId: 'combo1',
          inventoryLineType: 'COMBO_COMPONENT',
        },
      ]);
    });
  });

  describe('buildOrderEventPayload', () => {
    it('builds event payload with inventory rollback action', () => {
      const order = {
        _id: 'order1',
        merchantId: 'm1',
        workspaceId: 'w1',
        tenantId: 't1',
        items: [{ _id: 'item1', productId: 'prod1', qty: 1 }],
      };
      const payload = buildOrderEventPayload(order, ['ROLLBACK_INVENTORY_RESERVATION', 'RELEASE_VOUCHER'], {
        includeLifecycleLines: true,
      });

      expect(payload).toEqual({
        orderId: 'order1',
        merchantId: 'm1',
        workspaceId: 'w1',
        tenantId: 't1',
        lines: [
          {
            orderLineId: 'item1',
            productId: 'prod1',
            parentProductId: 'prod1',
            quantity: 1,
            inventoryLineType: 'ORDER_ITEM',
            action: 'release',
          },
        ],
      });
    });

    it('builds event payload with reservation lines', () => {
      const order = {
        _id: 'order1',
        items: [{ _id: 'item1', productId: 'prod1', qty: 1, sku: 'sku1', price: 10 }],
      };
      const payload = buildOrderEventPayload(order, [], {
        includeReservationLines: true,
        reserveTtlMinutes: 15,
      });

      expect(payload.reserveTtlMinutes).toBe(15);
      expect(payload.lines).toBeDefined();
      expect(payload.lines![0]).toHaveProperty('sku'); // Commercial fields included
    });
  });

  describe('buildOrderTimelineEntry', () => {
    it('builds timeline entry with metadata', () => {
      const entry = buildOrderTimelineEntry('new', 'USER_CREATE', {
        note: 'Test order',
        actorId: 'user1',
        actorModel: 'User',
      });

      expect(entry.status).toBe('new');
      expect(entry.action).toBe('USER_CREATE');
      expect(entry.note).toBe('Test order');
      expect(entry.createdById).toBe('user1');
      expect(entry.createdByOnModel).toBe('User');
      expect(entry.createdAt).toBeInstanceOf(Date);
    });
  });
});
