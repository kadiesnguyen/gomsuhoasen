export type OrderLifecycleEventKind =
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'ORDER_PAYMENT_EXPIRED'
  | 'ORDER_CANCELLED'
  | 'ORDER_PROCESSING'
  | 'ORDER_COMPLETED'
  | 'ORDER_REFUNDED'
  | 'ORDER_REFUND_REJECTED';

export type OrderLifecycleTimelineKind =
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PAID'
  | 'PAYMENT_EXPIRED'
  | 'ORDER_CANCELLED'
  | 'STORE_PROCESSING'
  | 'STORE_COMPLETED'
  | 'ORDER_REFUNDED'
  | 'ORDER_REFUND_REJECTED'
  | 'CUSTOMER_CONFIRM_RECEIVED';

export type OrderLifecycleIntentKind =
  | 'RESERVE_REDEEM_LEDGER'
  | 'REDEEM_VOUCHER'
  | 'RELEASE_REDEEM_LEDGER'
  | 'RELEASE_VOUCHER'
  | 'POST_REWARD_LEDGER'
  | 'ISSUE_TICKETS'
  | 'RELEASE_USER_VOUCHER'
  | 'RECORD_AUDIT_NOOP'
  | 'RESET_ON_HOLD_ESCALATIONS'
  | 'TAG_ORDER_OPS_REVIEW'
  | 'ROLLBACK_INVENTORY_RESERVATION';

export type OrderLifecycleNoopReason =
  | 'ALREADY_APPLIED'
  | 'ALREADY_TERMINAL'
  | 'STATE_CHANGED'
  | 'UNPAID_CONFLICT'
  | 'INVALID_STATE'
  | 'NOT_ALLOWED'
  | 'PAID'
  | 'UNPAID';

export type OrderLifecycleAuditKind =
  | 'PAYMENT_WEBHOOK_TERMINAL_NOOP'
  | 'PAYMENT_WEBHOOK_DUPLICATE_NOOP'
  | 'RESERVATION_FAILED_REPLAY_NOOP';

export interface OrderLifecyclePlan {
  nextOrderStatus: string;
  nextPaymentStatus?: string;
  nextFulfillmentStatus?: string | null;
  paymentSessionTarget?: 'PAID' | 'EXPIRED' | 'CANCELLED';
  timelineKind: OrderLifecycleTimelineKind;
  eventKind: OrderLifecycleEventKind;
  intents: readonly OrderLifecycleIntentKind[];
  noOpReason?: OrderLifecycleNoopReason;
  auditKind?: OrderLifecycleAuditKind;
}

export type RefundRequestSourceKind = 'STAFF' | 'CUSTOMER' | 'SHIPMENT_RETURN' | 'MEMBERSHIP_REJECT';

export type RefundLifecycleTimelineKind = 'REFUND_REQUESTED' | 'REFUND_APPROVED' | 'REFUND_REJECTED';
export type RefundLifecycleEventKind = 'ORDER_REFUND_REQUESTED' | 'ORDER_REFUNDED' | 'ORDER_REFUND_REJECTED';
export type RefundLifecycleIntentKind = 'CLEAR_REFUND_SNAPSHOT_LINES' | 'REBUILD_REFUND_SNAPSHOT_LINES' | 'RELEASE_VOUCHER' | 'RELEASE_USER_VOUCHER' | 'ROLLBACK_INVENTORY_RESERVATION';

export interface RefundLifecyclePlan {
  nextOrderStatus?: string;
  nextRefundStatus?: string;
  timelineKind: RefundLifecycleTimelineKind;
  eventKind: RefundLifecycleEventKind;
  intents: readonly RefundLifecycleIntentKind[];
  noOpReason?: 'ALREADY_APPLIED' | 'ALREADY_TERMINAL' | 'STATE_CHANGED' | 'NOT_MEMBERSHIP_ORDER' | 'UNPAID_FOR_REFUND';
}

// ---------------------------------------------------------------------------
// Payload Types
// ---------------------------------------------------------------------------

export type InventoryLineType = 'ORDER_ITEM' | 'COMBO_COMPONENT';

export interface InventoryReservationLine {
  orderLineId: string;
  productId?: string;
  quantity: number;
  sku?: string;
  price?: number;
  parentOrderLineId?: string;
  parentProductId?: string;
  inventoryLineType: InventoryLineType;
}

export interface InventoryLifecycleLine {
  orderLineId: string;
  productId?: string;
  quantity: number;
  sku?: string;
  price?: number;
  parentOrderLineId?: string;
  parentProductId?: string;
  inventoryLineType: InventoryLineType;
}

export interface InventoryReleaseLine {
  orderLineId: string;
  quantity: number;
  productId?: string;
  parentOrderLineId?: string;
  parentProductId?: string;
  inventoryLineType?: InventoryLineType;
}

export interface InventoryRefundLine {
  orderLineId: string;
  productId: string;
  quantity: number;
  parentOrderLineId?: string;
  parentProductId: string;
  inventoryLineType: InventoryLineType;
}

export interface OrderTimelineEntry {
  status: string;
  action: string;
  note?: string;
  createdAt: Date;
  createdById?: any;
  createdByOnModel?: string;
}

export interface OrderEventPayload {
  orderId: string;
  merchantId: string;
  workspaceId: string;
  tenantId: string;
  action?: string;
  // Reservation specifics
  reserveTtlMinutes?: number;
  stockAlreadyReserved?: boolean;
  lines?: InventoryReservationLine[] | InventoryLifecycleLine[] | InventoryReleaseLine[];
  // Fallback for custom fields
  [key: string]: any;
}
