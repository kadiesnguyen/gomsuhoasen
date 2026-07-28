import { allocateProportionalQuantities, ProportionalQuantityAllocationInputError } from '@vt/domain-recipes';
import { calculateRefundCompensationRatio } from './pricing.contracts';
import type {
  InventoryLifecycleLine,
  InventoryReleaseLine,
  InventoryReservationLine,
  InventoryRefundLine,
  OrderEventPayload,
  OrderLifecycleIntentKind,
  OrderTimelineEntry,
  RefundLifecycleIntentKind,
} from './order-lifecycle.contracts';

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

export class PayloadBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayloadBuilderError';
  }
}

// ---------------------------------------------------------------------------
// Types expected by builder (generic enough to decouple from mongoose)
// ---------------------------------------------------------------------------

export interface CoreComboItem {
  productId?: any;
  quantity?: number;
}

export interface CoreOrderLineItem {
  _id?: any;
  id?: any; // Fallback
  lineId?: any; // Canonical fallback
  productId?: any;
  qty?: number;
  sku?: string;
  price?: number;
  comboItems?: CoreComboItem[] | null;
}

export interface CoreOrderPayload {
  _id?: any;
  id?: any; // Fallback
  merchantId?: any;
  workspaceId?: any;
  tenantId?: any;
  items?: CoreOrderLineItem[];
  // Other fields can be passed through to event payload
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractStringId(id: any, context: string): string {
  if (id === null || id === undefined) {
    throw new PayloadBuilderError(`${context} is missing or undefined`);
  }
  const strId = typeof id.toString === 'function' ? id.toString() : String(id);
  if (!strId) {
    throw new PayloadBuilderError(`${context} resulted in empty string`);
  }
  return strId;
}

function extractPositiveInteger(val: any, context: string): number {
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0) {
    throw new PayloadBuilderError(`${context} must be a positive integer, got ${val}`);
  }
  return num;
}

export function buildComboComponentInventoryLineId(
  parentOrderLineId: string,
  componentProductId: string,
  componentIndex: number,
): string {
  return `${parentOrderLineId}:component:${componentIndex}:${componentProductId}`;
}

function extractTrimmedIdLike(id: any, context: string): string {
  const rawId = id && typeof id === 'object' && '_id' in id
    ? id._id
    : id;
  if (rawId === null || rawId === undefined) {
    throw new PayloadBuilderError(`${context} is missing or undefined`);
  }
  const strId = typeof rawId === 'string'
    ? rawId.trim()
    : (typeof rawId.toString === 'function' ? rawId.toString().trim() : String(rawId).trim());
  if (!strId || strId === '[object Object]') {
    throw new PayloadBuilderError(`${context} resulted in empty string`);
  }
  return strId;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildInventoryReservationLines(
  orderId: string,
  items: CoreOrderLineItem[] = [],
  options?: { includeCommercialFields?: boolean; requireParentProductId?: boolean },
): InventoryReservationLine[] {
  const lines: InventoryReservationLine[] = [];

  for (const [index, item] of items.entries()) {
    const lineContext = `order ${orderId} reservation line[${index}]`;
    const parentOrderLineId = extractStringId(item.lineId || item._id || item.id, lineContext + ' _id');
    const parentQuantity = extractPositiveInteger(item.qty, lineContext + ' qty');
    const comboItems = Array.isArray(item.comboItems) ? item.comboItems : [];
    
    let parentProductId: string | undefined;
    if (options?.requireParentProductId || comboItems.length > 0) {
      parentProductId = extractStringId(item.productId, lineContext + ' productId');
    } else if (item.productId) {
      parentProductId = item.productId.toString();
    }

    if (comboItems.length === 0) {
      const parentLine: InventoryReservationLine = {
        orderLineId: parentOrderLineId,
        quantity: parentQuantity,
        inventoryLineType: 'ORDER_ITEM',
      };
      if (parentProductId) {
        parentLine.productId = parentProductId;
        parentLine.parentProductId = parentProductId;
      }
      if (options?.includeCommercialFields) {
        parentLine.sku = extractStringId(item.sku, lineContext + ' sku');
        const price = Number(item.price);
        if (Number.isNaN(price) || price < 0) {
          throw new PayloadBuilderError(`${lineContext} price must be a non-negative number`);
        }
        parentLine.price = price;
      }
      lines.push(parentLine);
      continue;
    }

    comboItems.forEach((comboItem, componentIndex) => {
      const componentContext = `${lineContext} combo component[${componentIndex}]`;
      const componentProductId = extractStringId(comboItem.productId, componentContext + ' productId');
      const componentQuantity = extractPositiveInteger(comboItem.quantity, componentContext + ' quantity');
      
      lines.push({
        orderLineId: buildComboComponentInventoryLineId(
          parentOrderLineId,
          componentProductId,
          componentIndex,
        ),
        productId: componentProductId,
        quantity: parentQuantity * componentQuantity,
        parentOrderLineId,
        parentProductId,
        inventoryLineType: 'COMBO_COMPONENT',
      });
    });
  }

  return lines;
}

export function buildInventoryLifecycleLines(
  orderId: string,
  items: CoreOrderLineItem[] = [],
): InventoryLifecycleLine[] {
  // Inventory lifecycle lines are the same structure as reservation lines without commercial fields
  return buildInventoryReservationLines(orderId, items, {
    includeCommercialFields: false,
    requireParentProductId: true,
  }) as InventoryLifecycleLine[];
}

export function buildInventoryReleaseLines(
  orderId: string,
  items: CoreOrderLineItem[] = [],
): InventoryReleaseLine[] {
  const lines: InventoryReleaseLine[] = [];

  for (const [index, item] of items.entries()) {
    const lineContext = `order ${orderId} release line[${index}]`;
    const parentOrderLineId = extractTrimmedIdLike(item.lineId ?? item._id ?? item.id, `${lineContext} lineId`);
    const parentQuantity = extractPositiveInteger(item.qty, `${lineContext} qty`);
    const comboItems = Array.isArray(item.comboItems) ? item.comboItems : [];

    if (comboItems.length === 0) {
      lines.push({
        orderLineId: parentOrderLineId,
        quantity: parentQuantity,
      });
      continue;
    }

    const parentProductId = extractTrimmedIdLike(item.productId, `${lineContext} productId`);
    comboItems.forEach((comboItem, componentIndex) => {
      const componentContext = `${lineContext} combo component[${componentIndex}]`;
      const componentProductId = extractTrimmedIdLike(comboItem.productId, `${componentContext} productId`);
      const componentQuantity = extractPositiveInteger(comboItem.quantity, `${componentContext} quantity`);
      lines.push({
        orderLineId: buildComboComponentInventoryLineId(
          parentOrderLineId,
          componentProductId,
          componentIndex,
        ),
        productId: componentProductId,
        quantity: extractPositiveInteger(parentQuantity * componentQuantity, `${componentContext} multiplied quantity`),
        parentOrderLineId,
        parentProductId,
        inventoryLineType: 'COMBO_COMPONENT',
      });
    });
  }

  return lines;
}

export function buildOrderEventPayload(
  orderData: CoreOrderPayload,
  intents: readonly (OrderLifecycleIntentKind | RefundLifecycleIntentKind)[],
  options?: {
    reserveTtlMinutes?: number;
    stockAlreadyReserved?: boolean;
    includeReservationLines?: boolean;
    includeLifecycleLines?: boolean;
  }
): OrderEventPayload {
  const { _id, id, items, merchantId, workspaceId, tenantId, ...rest } = orderData;
  const orderId = extractStringId(_id || id, 'orderId');
  
  const payload: OrderEventPayload = {
    ...rest,
    orderId,
    merchantId: merchantId?.toString(),
    workspaceId: workspaceId?.toString(),
    tenantId: tenantId?.toString(),
  };

  // Reservation specific fields
  if (options?.reserveTtlMinutes !== undefined) {
    payload.reserveTtlMinutes = options.reserveTtlMinutes;
  }
  if (options?.stockAlreadyReserved !== undefined) {
    payload.stockAlreadyReserved = options.stockAlreadyReserved;
  }

  // Lines
  if (options?.includeReservationLines) {
    const r = buildInventoryReservationLines(orderId, orderData.items || [], {
      includeCommercialFields: true,
      requireParentProductId: true,
    });
    payload.lines = intents.includes('ROLLBACK_INVENTORY_RESERVATION')
      ? r.map(line => ({ ...line, action: 'release' }))
      : r;
  } else if (options?.includeLifecycleLines) {
    const l = buildInventoryLifecycleLines(orderId, orderData.items || []);
    payload.lines = intents.includes('ROLLBACK_INVENTORY_RESERVATION')
      ? l.map(line => ({ ...line, action: 'release' }))
      : l;
  }

  return payload;
}

export function buildOrderTimelineEntry(
  status: string,
  action: string,
  metadata?: {
    note?: string;
    actorId?: any;
    actorModel?: string; // 'User' | 'Staff' | 'System'
    createdAt?: Date;
  }
): OrderTimelineEntry {
  return {
    status,
    action,
    note: metadata?.note,
    createdAt: metadata?.createdAt || new Date(),
    createdById: metadata?.actorId,
    createdByOnModel: metadata?.actorModel,
  };
}

export function buildInventoryRefundCompensationLines(
  orderId: string,
  finalAmount: number | undefined,
  refundAmount: number | undefined,
  items: CoreOrderLineItem[],
  refundInfoItemIds?: readonly (string | { toString(): string })[],
): InventoryRefundLine[] {
  const normalizedOrderAmount = extractPositiveInteger(finalAmount, 'finalAmount');
  const normalizedRefundAmount = extractPositiveInteger(refundAmount, 'refundAmount');
  const ratio = calculateRefundCompensationRatio(normalizedOrderAmount, normalizedRefundAmount);

  if (ratio <= 0) {
    return [];
  }

  const scopedItemIds = new Set<string>();
  if (Array.isArray(refundInfoItemIds)) {
    for (const id of refundInfoItemIds) {
      scopedItemIds.add(id.toString());
    }
  }

  const mappedLines = buildInventoryReservationLines(orderId, items, { requireParentProductId: true })
    .filter((line): line is InventoryReservationLine & { productId: string; parentProductId: string } =>
      Boolean(line.productId && line.parentProductId),
    );

  const candidateLines = scopedItemIds.size > 0
    ? mappedLines.filter((line) => scopedItemIds.has(line.parentProductId))
    : mappedLines;

  if (candidateLines.length === 0) {
    return [];
  }

  try {
    return allocateProportionalQuantities({
      ratio,
      lines: candidateLines.map((line) => ({
        quantity: line.quantity,
        tieBreaker: line.orderLineId,
        payload: {
          orderLineId: line.orderLineId,
          productId: line.productId,
          parentOrderLineId: line.parentOrderLineId,
          parentProductId: line.parentProductId,
          inventoryLineType: line.inventoryLineType,
        },
      })),
    }).map((line) => ({
      orderLineId: line.payload.orderLineId,
      productId: line.payload.productId,
      quantity: line.quantity,
      ...(line.payload.parentOrderLineId ? { parentOrderLineId: line.payload.parentOrderLineId } : {}),
      parentProductId: line.payload.parentProductId,
      inventoryLineType: line.payload.inventoryLineType,
    }));
  } catch (error: unknown) {
    if (error instanceof ProportionalQuantityAllocationInputError) {
      throw new PayloadBuilderError(`Inventory refund compensation quantity allocation is invalid: fieldName=${error.fieldName} order=${orderId}`);
    }
    throw error;
  }
}
