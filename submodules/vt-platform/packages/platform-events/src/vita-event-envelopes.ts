import {
  type ApplicationScopeEventMetadata,
  buildApplicationScopeEventMetadata,
} from '@vt/platform-config';
import type {
  VitaCommissionPayload,
  VitaOrderPayload,
  VitaRankUpgradePayload,
} from './event-catalog';

export interface VitaEventEnvelope<TPayload> {
  payload: TPayload;
  metadata: ApplicationScopeEventMetadata;
}

type OutboxCompatiblePayload<TPayload extends object> = TPayload & Record<string, unknown>;

export interface VitaOrderEventSource {
  orderId: string;
  orderNumber: string;
  memberId: string;
  memberLevel?: number | null;
  status: string;
  paymentStatus: string;
  paymentSessionId?: string | null;
  orderAmount: number;
  pointsRedeemed?: number | null;
}

export interface VitaRankUpgradeEventSource {
  upgradeCode: string;
  memberId: string;
  currentLevel: number;
  targetLevel: number;
  status: string;
  paymentSessionId?: string | null;
  amountDue: number;
  method: string;
}

export interface VitaCommissionEventSource {
  orderId: string;
  memberId: string;
  ledgerCount: number;
  totalCommission: number;
  correlationId: string;
}

export function buildVitaOrderEventEnvelope(
  scopeId: string,
  input: VitaOrderEventSource,
): VitaEventEnvelope<OutboxCompatiblePayload<VitaOrderPayload>> {
  return {
    payload: {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      memberId: input.memberId,
      memberLevel: input.memberLevel ?? 1,
      status: input.status,
      paymentStatus: input.paymentStatus,
      paymentSessionId: input.paymentSessionId ?? undefined,
      orderAmount: input.orderAmount,
      pointsRedeemed: input.pointsRedeemed ?? 0,
    },
    metadata: buildApplicationScopeEventMetadata({
      scopeId,
      aggregateType: 'order',
      aggregateId: input.orderId,
      correlationId: input.paymentSessionId ?? input.orderId,
    }),
  };
}

export function buildVitaRankUpgradeEventEnvelope(
  scopeId: string,
  input: VitaRankUpgradeEventSource,
): VitaEventEnvelope<OutboxCompatiblePayload<VitaRankUpgradePayload>> {
  return {
    payload: {
      upgradeCode: input.upgradeCode,
      memberId: input.memberId,
      currentLevel: input.currentLevel,
      targetLevel: input.targetLevel,
      status: input.status,
      paymentSessionId: input.paymentSessionId ?? undefined,
      amountDue: input.amountDue,
      method: input.method,
    },
    metadata: buildApplicationScopeEventMetadata({
      scopeId,
      aggregateType: 'rank_upgrade',
      aggregateId: input.upgradeCode,
      correlationId: input.paymentSessionId ?? input.upgradeCode,
    }),
  };
}

export function buildVitaCommissionEventEnvelope(
  scopeId: string,
  input: VitaCommissionEventSource,
): VitaEventEnvelope<OutboxCompatiblePayload<VitaCommissionPayload>> {
  return {
    payload: {
      orderId: input.orderId,
      memberId: input.memberId,
      ledgerCount: input.ledgerCount,
      totalCommission: input.totalCommission,
    },
    metadata: buildApplicationScopeEventMetadata({
      scopeId,
      aggregateType: 'commission',
      aggregateId: input.orderId,
      correlationId: input.correlationId,
    }),
  };
}
