/**
 * Event Catalog — Topic inventory with payload contracts.
 *
 * Phase 1b: Inventory all event topics across v2 (98+), VITA (9), GHS (4+).
 * Status: INVENTORY DRAFT — not yet canonical. See notes per group.
 * Pure TypeScript payload types (no zod/class-validator runtime dependency).
 *
 * Usage:
 * - Producers import the topic constant + payload type
 * - Consumers import the topic constant + payload type
 * - Both get compile-time safety that the contract matches
 *
 * Naming convention: `<domain>.<entity>.<action>[.version]`
 */

// ────────────────────────────────────────────────
// Core / System
// ────────────────────────────────────────────────

export const PLATFORM_TOPICS = {
  /** Internal: emitted by OutboxService after staging an event */
  PLATFORM_OUTBOX_CREATED: 'platform.outbox.created',
  /** Legacy alias — v2 constants use this shorter form */
  OUTBOX_CREATED: 'outbox.created',
  SYSTEM_AUDIT_LOG: 'system.audit.log',
} as const;

export interface OutboxCreatedPayload {
  outboxId: string;
  eventType: string;
}

export interface SystemAuditLogPayload {
  actorId: string;
  action: string;
  resource: string;
  resourceId: string;
  detail?: Record<string, unknown>;
}

// ────────────────────────────────────────────────
// IAM
// ────────────────────────────────────────────────

export const IAM_CATALOG_TOPICS = {
  INVITATION_CREATED: 'iam.invitation.created',
  INVITATION_ACCEPTED: 'iam.invitation.accepted',
  MEMBERSHIP_LEFT: 'iam.membership.left',
  TENANT_PROVISIONING_STATUS: 'iam.tenant.provisioning.status',
  AUTH_NOTIFICATION_SEND: 'auth.notification.send',
} as const;

export interface IamInvitationPayload {
  invitationId: string;
  tenantId: string;
  invitedEmail: string;
  roles: string[];
}

export interface TenantProvisioningPayload {
  tenantId: string;
  status: 'pending' | 'completed' | 'failed';
  step?: string;
}

// ────────────────────────────────────────────────
// Ecommerce
// ────────────────────────────────────────────────

export const ECOMMERCE_CATALOG_TOPICS = {
  ORDER_CREATED: 'ecommerce.order.created',
  ORDER_CONFIRMED: 'ecommerce.order.confirmed',
  ORDER_SHIPPED: 'ecommerce.order.shipped',
  ORDER_CANCELLED: 'ecommerce.order.cancelled',
  ORDER_COMPLETED: 'ecommerce.order.completed',
  ORDER_REFUND_REQUESTED: 'ecommerce.order.refund.requested',
  ORDER_REFUNDED: 'ecommerce.order.refunded',
  ORDER_PAYMENT_SUCCEEDED: 'ecommerce.order.payment.succeeded',
  ORDER_PAYMENT_FAILED: 'ecommerce.order.payment.failed',
  ORDER_PAYMENT_TIMEOUT: 'ecommerce.order.payment.timeout',
  ORDER_RESERVATION_FAILED: 'ecommerce.order.reservation.failed',
  ORDER_RESERVATION_RELEASE_REQUESTED: 'ecommerce.order.reservation.release.requested',
  ORDER_POINT_REDEMPTION_REQUESTED: 'ecommerce.order.point_redemption_requested',
} as const;

/**
 * @deprecated Legacy ecommerce topics — still used by existing listeners.
 * Migrate listeners to ECOMMERCE_CATALOG_TOPICS before removal.
 */
export const ECOMMERCE_LEGACY_TOPICS = {
  ORDER_CONFIRMED_LEGACY: 'order.confirmed',
  ORDER_SHIPPED_LEGACY: 'order.shipped',
  ORDER_CANCELLED_LEGACY: 'order.cancelled',
  ORDER_COMPLETED_LEGACY: 'order.completed',
  ORDER_REFUND_REQUESTED_LEGACY: 'order.refund_requested',
} as const;

export interface OrderEventPayload {
  orderId: string;
  orderNumber: string;
  tenantId?: string;
  customerId?: string;
  status: string;
  totalAmount: number;
  currency?: string;
}

// ────────────────────────────────────────────────
// Shipping
// ────────────────────────────────────────────────

export const SHIPPING_CATALOG_TOPICS = {
  CREATED: 'shipping.shipment.created',
  STATUS_UPDATED: 'shipping.status_updated',
  DELIVERED: 'shipping.delivered',
  FAILED: 'shipping.failed',
  RETURNED: 'shipping.returned',
  COD_RECONCILED: 'shipping.cod.reconciled',
} as const;

export interface ShippingEventPayload {
  shipmentId: string;
  orderId: string;
  carrierId: string;
  trackingCode: string;
  status: string;
}

// ────────────────────────────────────────────────
// Loyalty / Membership
// ────────────────────────────────────────────────

export const LOYALTY_CATALOG_TOPICS = {
  METRICS_UPDATED: 'loyalty.metrics.updated',
  MEMBERSHIP_TIER_CHANGED: 'membership.tier.changed',
  MEMBERSHIP_TIER_GRACE_STARTED: 'membership.tier.grace_started',
  MEMBERSHIP_GRACE_EXPIRED: 'membership.grace.expired',
  TIER_GRACE_WARNING: 'loyalty.tier.grace_warning',
  POINTS_EXPIRED: 'loyalty.points.expired',
  POINTS_EXPIRING_SOON: 'loyalty.points.expiring_soon',
  POINTS_REDEEMED: 'loyalty.points.redeemed',
  TIER_UPGRADED: 'loyalty.tier_upgraded',
  TRIGGER_BIRTHDAYS: 'loyalty.trigger.birthdays',
} as const;

export const MEMBERSHIP_CATALOG_TOPICS = {
  PURCHASE_ACTIVATED: 'membership.purchase.activated',
  PURCHASE_EXPIRED: 'membership.purchase.expired',
  PURCHASE_EXPIRY_WARNING: 'membership.purchase.expiry_warning',
  PURCHASE_UPGRADED: 'membership.purchase.upgraded',
  PURCHASE_REJECTED: 'membership.purchase.rejected',
  FUND_ALLOCATED: 'membership.fund.allocated',
  TIER_EVALUATED: 'membership.tier.evaluated',
  TIER_DOWNGRADED: 'membership.tier.downgraded',
  USER_VOUCHER_CREATED: 'membership.user_voucher.created',
  USER_VOUCHER_COLLECTED: 'membership.user_voucher.collected',
  USER_VOUCHER_USED: 'membership.user_voucher.used',
  USER_VOUCHER_INVALIDATED: 'membership.user_voucher.invalidated',
} as const;

export interface LoyaltyMetricsPayload {
  memberId: string;
  tenantId?: string;
  totalPoints: number;
  currentTier: string;
}

export interface MembershipPurchasePayload {
  purchaseId: string;
  memberId: string;
  tierId: string;
  status: string;
  amount: number;
}

// ────────────────────────────────────────────────
// Affiliate
// ────────────────────────────────────────────────

export const AFFILIATE_CATALOG_TOPICS = {
  COMMISSION_CREATED: 'commission.created',
  FRAUD_FLAGGED: 'affiliate.fraud.flagged',
  FRAUD_CONFIRMED: 'affiliate.fraud.confirmed',
  WITHDRAWAL_REQUESTED: 'affiliate.withdrawal.requested',
  WITHDRAWAL_REMINDER: 'affiliate.withdrawal.reminder',
} as const;

export interface AffiliateCommissionPayload {
  commissionId: string;
  orderId: string;
  memberId: string;
  amount: number;
  status: string;
}

// ────────────────────────────────────────────────
// Catalog
// ────────────────────────────────────────────────

export const CATALOG_CATALOG_TOPICS = {
  PRODUCT_CREATED: 'catalog.product.created',
  PRODUCT_UPDATED: 'catalog.product.updated',
  PRODUCT_DELETED: 'catalog.product.deleted',
  CATEGORY_CREATED: 'catalog.category.created',
  CATEGORY_DELETED: 'catalog.category.deleted',
  PRODUCT_PUBLISHED_AS_KNOWLEDGE_SOURCE: 'catalog.product.published_as_knowledge_source',
  PRODUCT_RETIRED_FROM_KNOWLEDGE_SOURCE: 'catalog.product.retired_from_knowledge_source',
} as const;

export const CMS_CATALOG_TOPICS = {
  ARTICLE_PUBLISHED_AS_KNOWLEDGE_SOURCE: 'cms.article.published_as_knowledge_source',
  ARTICLE_RETIRED_FROM_KNOWLEDGE_SOURCE: 'cms.article.retired_from_knowledge_source',
} as const;

export interface CatalogProductPayload {
  productId: string;
  tenantId?: string;
  sku?: string;
  action: 'created' | 'updated' | 'deleted';
}

// ────────────────────────────────────────────────
// Inventory
// ────────────────────────────────────────────────

export const INVENTORY_CATALOG_TOPICS = {
  STOCK_ADJUSTED: 'inventory.stock.adjusted',
  LOW_STOCK: 'inventory.low_stock',
  WMS_FULFILLMENT_FAILED: 'wms.fulfillment_failed',
  INVENTORY_COMPENSATION_PENDING: 'inventory.compensation.pending',
  OMS_COMPENSATION_APPROVED: 'oms.inventory.compensation.approved',
  INVENTORY_COMPENSATED: 'inventory.compensated',
  INVENTORY_WRITEOFF_RECOGNIZED: 'inventory.writeoff.recognized.v1',
} as const;

export interface InventoryStockPayload {
  productId: string;
  variantId?: string;
  tenantId?: string;
  quantity: number;
  previousQuantity: number;
  reason: string;
}

// ────────────────────────────────────────────────
// Content Marketing
// ────────────────────────────────────────────────

export const CONTENT_MARKETING_CATALOG_TOPICS = {
  CHANNEL_DISCONNECTED: 'channel.disconnected',
  PUBLISH_JOB_SCHEDULED: 'cm.publish_job.scheduled',
  PUBLISH_JOB_PUBLISHING: 'cm.publish_job.publishing',
  PUBLISH_JOB_PUBLISHED: 'cm.publish_job.published',
  PUBLISH_JOB_FAILED: 'cm.publish_job.failed',
  PUBLISH_JOB_CANCELLED: 'cm.publish_job.cancelled',
  PUBLISH_JOB_RETRYING: 'cm.publish_job.retrying',
  TOPIC_EXPAND_COMPLETED: 'cm.topic_expand.completed',
  CONTENT_PUBLISHED: 'content.published',
  OUTCOME_PUBLISHED: 'cm.outcome.published',
  OUTCOME_FAILED: 'cm.outcome.failed',
} as const;

// ────────────────────────────────────────────────
// Open Channel / Messaging
// ────────────────────────────────────────────────

export const OPEN_CHANNEL_CATALOG_TOPICS = {
  ZALO_RAW_MESSAGE_RECEIVED: 'zalo.raw.message.received',
  FB_RAW_MESSAGE_RECEIVED: 'fb.raw.message.received',
  CHANNEL_INBOUND_MESSAGE: 'channel.inbound.message.v1',
  CHANNEL_TOKEN_EXPIRED: 'channel.token.expired',
} as const;

// ────────────────────────────────────────────────
// VITA-specific
// ────────────────────────────────────────────────

export const VITA_CATALOG_TOPICS = {
  ORDER_CREATED: 'vita.order.created',
  ORDER_PAID: 'vita.order.paid',
  ORDER_PAYMENT_EXPIRED: 'vita.order.payment_expired',
  ORDER_CANCELLED: 'vita.order.cancelled',
  COMMISSION_CALCULATED: 'vita.commission.calculated',
  RANK_UPGRADE_STARTED: 'vita.rank_upgrade.started',
  RANK_UPGRADE_PAID: 'vita.rank_upgrade.paid',
  RANK_UPGRADE_EXPIRED: 'vita.rank_upgrade.expired',
  RANK_UPGRADE_CANCELLED: 'vita.rank_upgrade.cancelled',
} as const;

export interface VitaOrderPayload {
  orderId: string;
  orderNumber: string;
  memberId: string;
  memberLevel: number;
  status: string;
  paymentStatus: string;
  paymentSessionId?: string;
  orderAmount: number;
  pointsRedeemed: number;
}

export interface VitaCommissionPayload {
  orderId: string;
  memberId: string;
  ledgerCount: number;
  totalCommission: number;
}

export interface VitaRankUpgradePayload {
  upgradeCode: string;
  memberId: string;
  currentLevel: number;
  targetLevel: number;
  status: string;
  paymentSessionId?: string;
  amountDue: number;
  method: string;
}

// ────────────────────────────────────────────────
// GHS-specific
// ────────────────────────────────────────────────

export const GHS_CATALOG_TOPICS = {
  QUOTE_CREATED: 'ghs.quote.created',
  QUOTE_SENT: 'ghs.quote.sent',
  QUOTE_ACCEPTED: 'ghs.quote.accepted',
  QUOTE_REJECTED: 'ghs.quote.rejected',
} as const;

export interface GhsQuotePayload {
  quoteId: string;
  quoteCode: string;
  rfqId?: string;
  status: string;
  /** Matches producer field name `total` in quote.service.ts */
  total: number;
}

// ────────────────────────────────────────────────
// Additional v2 topics (misc)
// ────────────────────────────────────────────────

export const AI_CATALOG_TOPICS = {
  GENERATION_COMPLETED: 'ai.generation.completed',
  PROMPT_VERSION_ACTIVATED: 'ai.prompt.version.activated',
  EVAL_RUN_QUEUED: 'ai.eval.run.queued',
  EVAL_RUN_CANCELLED: 'ai.eval.run.cancelled',
  CHATBOT_SESSION_STARTED: 'ai.chatbot.session.started',
  CHATBOT_MESSAGE_SENT: 'ai.chatbot.message.sent',
  CHATBOT_HANDOFF_REQUESTED: 'ai.chatbot.handoff.requested',
} as const;

export const ENABLEMENT_CATALOG_TOPICS = {
  BUSINESSTYPE_UPDATED: 'enablement.businesstype.updated',
  BUSINESSTYPE_ASSIGNED: 'enablement.businesstype.assigned',
  POLICY_UPDATED: 'enablement.policy.updated',
} as const;

export const CRM_CATALOG_TOPICS = {
  PARTY_PROFILE_TIER_UPGRADED: 'crm.party-profile.tier.upgraded',
  PARTY_PROFILE_TIER_DOWNGRADED: 'crm.party-profile.tier.downgraded',
} as const;

export const CUSTOMER_CATALOG_TOPICS = {
  PROFILE_TIER_MIRROR_SYNCED: 'customer.profile.tier.mirror.synced',
  PROFILE_TIER_MIRROR_DRIFT_DETECTED: 'customer.profile.tier.mirror.drift.detected',
} as const;

export const BILLING_CATALOG_TOPICS = {
  USAGE_RECORDED: 'billing.usage_recorded',
} as const;

export const INBOX_CATALOG_TOPICS = {
  CHANNEL_SEND_FAILED: 'inbox.channel_send.failed',
} as const;

export const MINI_APP_CATALOG_TOPICS = {
  VERSION_CREATED: 'mini-app.version.created',
  JOB_STATUS_CHANGED: 'mini-app.job.status_changed',
  JOB_CREATED: 'mini-app.job.created',
} as const;

export const COMMS_CATALOG_TOPICS = {
  FEED_INGEST: 'feed.ingest',
  FEED_RELAY_NEW: 'esn.feed.new.v1',
} as const;

export const PROCUREMENT_CATALOG_TOPICS = {
  RECEIVED: 'procurement.received',
} as const;

export type EventCatalogContractStatus =
  | 'canonical'
  | 'advisory'
  | 'local'
  | 'deprecated';

export interface EventCatalogGroupDecision {
  group: string;
  status: EventCatalogContractStatus;
  owner: 'platform' | 'v2' | 'VITA' | 'GHS';
  reason: string;
}

/**
 * Contract status for event groups.
 *
 * - canonical: shared contract; producers/consumers should import from this package.
 * - advisory: inventory is useful, but runtime producers may still own local constants.
 * - local: project-specific topic group kept here for typed visibility only.
 * - deprecated: legacy listener compatibility only; do not add new producers.
 */
export const EVENT_CATALOG_GROUP_DECISIONS = [
  { group: 'PLATFORM_TOPICS', status: 'canonical', owner: 'platform', reason: 'Outbox/audit topics are shared platform infrastructure.' },
  { group: 'IAM_CATALOG_TOPICS', status: 'advisory', owner: 'v2', reason: 'IAM runtime producers still live in v2 modules.' },
  { group: 'ECOMMERCE_CATALOG_TOPICS', status: 'advisory', owner: 'v2', reason: 'Order/payment flow remains v2-owned until consumer adoption is proven.' },
  { group: 'ECOMMERCE_LEGACY_TOPICS', status: 'deprecated', owner: 'v2', reason: 'Legacy listener compatibility only.' },
  { group: 'SHIPPING_CATALOG_TOPICS', status: 'advisory', owner: 'v2', reason: 'Carrier adapters are shared, but shipping workflow state remains v2-owned.' },
  { group: 'CATALOG_CATALOG_TOPICS', status: 'advisory', owner: 'v2', reason: 'Catalog runtime producers still live in v2.' },
  { group: 'CMS_CATALOG_TOPICS', status: 'advisory', owner: 'v2', reason: 'CMS runtime producers still live in v2.' },
  { group: 'VITA_CATALOG_TOPICS', status: 'local', owner: 'VITA', reason: 'VITA-specific order/rank/commission topics.' },
  { group: 'GHS_CATALOG_TOPICS', status: 'local', owner: 'GHS', reason: 'Single-business quote lifecycle topics.' },
  { group: 'AI_CATALOG_TOPICS', status: 'advisory', owner: 'v2', reason: 'AI providers and graph runtime remain v2-owned.' },
  { group: 'COMMS_CATALOG_TOPICS', status: 'advisory', owner: 'v2', reason: 'Comms engine is shared, but feed topics still need producer migration proof.' },
] as const satisfies readonly EventCatalogGroupDecision[];
