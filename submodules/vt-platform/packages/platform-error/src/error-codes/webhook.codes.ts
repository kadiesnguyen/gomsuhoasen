/** Webhook domain error codes — webhooks, signatures, delivery */
export const WEBHOOK_ERROR_CODES = {
  // ── Entity not found ──
  WEBHOOK_NOT_FOUND: 'WEBHOOK_NOT_FOUND',

  // ── Validation errors ──
  WEBHOOK_INVALID_SIGNATURE: 'WEBHOOK_INVALID_SIGNATURE',
  WEBHOOK_PAYLOAD_INVALID: 'WEBHOOK_PAYLOAD_INVALID',

  // ── State conflict ──
  WEBHOOK_ALREADY_PROCESSED: 'WEBHOOK_ALREADY_PROCESSED',

  // ── External service ──
  WEBHOOK_DELIVERY_FAILED: 'WEBHOOK_DELIVERY_FAILED',
} as const;

export type WebhookErrorCode = (typeof WEBHOOK_ERROR_CODES)[keyof typeof WEBHOOK_ERROR_CODES];
