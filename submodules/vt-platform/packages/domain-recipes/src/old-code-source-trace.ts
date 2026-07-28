export type DomainRecipeTraceScope = 'modern-runtime' | 'future-title-program' | 'reference-only';

export interface DomainRecipeOldCodeSourceTrace {
  recipe: string;
  scope: DomainRecipeTraceScope;
  sourcePaths: readonly string[];
  adoptedFacts: readonly string[];
  excludedFacts: readonly string[];
}

export const DOMAIN_RECIPE_OLD_CODE_SOURCE_TRACE = [
  {
    recipe: 'membership.rank.conditions',
    scope: 'modern-runtime',
    sourcePaths: [
      'OLD_CODE/crm_9102/doar-react/packages/main/src/models/api/membershipConditions.type.ts',
      'OLD_CODE/crmv2_8801/src/models/api/membershipConditions.type.ts',
      'OLD_CODE/fit-miniapp-master/src/models/api/membershipConditions.type.ts',
      'OLD_CODE/apiv2_8721/src/modules/membership/membershipConditions/membershipConditions.model.ts',
    ],
    adoptedFacts: [
      'membership condition setup is configurable per rank',
      'rank conditions can be evaluated from point/order/invite/custom metrics',
      'condition evaluation must be explicit service logic, not model hooks',
    ],
    excludedFacts: [
      'leader/high-leader/ambassador title conditions are not modern rank runtime',
    ],
  },
  {
    recipe: 'membership.benefits',
    scope: 'modern-runtime',
    sourcePaths: [
      'OLD_CODE/crm_9102/doar-react/packages/main/src/models/api/membership.type.ts',
      'OLD_CODE/crmv2_8801/src/models/api/membership.type.ts',
      'OLD_CODE/apiv2_8721/src/modules/membership/membership/membership.model.ts',
    ],
    adoptedFacts: [
      'benefit enable flags gate discount, commission, self-point, and withdrawal capabilities',
      'disabled benefit flags normalize to safe zero/false values',
    ],
    excludedFacts: [
      'Mongoose pre-update hooks are not copied as formula execution',
    ],
  },
  {
    recipe: 'membership.score.ledger',
    scope: 'modern-runtime',
    sourcePaths: [
      'OLD_CODE/apiv2_8721/src/tinhLaiPoint.ts',
      'OLD_CODE/crmv2_8801/src/pages/PointCoinManagement/PointTransaction.tsx',
      'OLD_CODE/tool_9106/src/pages/HistoryPoint/HistoryPoint.tsx',
    ],
    adoptedFacts: [
      'score movements are append-only ledger-like entries',
      'buyer/referrer/system lanes must stay distinguishable',
      'idempotent source identity is required for replay-safe recalculation',
    ],
    excludedFacts: [
      'raw queue scripts and direct database mutations are reference only',
    ],
  },
  {
    recipe: 'membership.wallet.withdrawal',
    scope: 'modern-runtime',
    sourcePaths: [
      'OLD_CODE/crmv2_8801/src/pages/collaboratorsWithdraw/requesWithdraw.tsx',
      'OLD_CODE/crmv2_8801/src/pages/PointCoinManagement/PointCoinManagement.tsx',
      'OLD_CODE/apiv2_8721/src/modules/membership/membershipResult/membershipResult.model.ts',
    ],
    adoptedFacts: [
      'available and pending balances are separate lanes',
      'withdrawal validation must report blocking reasons deterministically',
    ],
    excludedFacts: [
      'legacy UI state shape is not a shared runtime contract',
    ],
  },
  {
    recipe: 'voucher.validation.redemption',
    scope: 'modern-runtime',
    sourcePaths: [
      'OLD_CODE/apiv2_8721/src/modules/ecommerce/voucher/voucher.model.ts',
      'OLD_CODE/apiv2_8721/src/modules/ecommerce/voucher/voucher.service.ts',
      'OLD_CODE/apiv2_8721/src/modules/ecommerce/order/queue/onOrderByVoucher.ts',
      'OLD_CODE/crmv2_8801/src/models/api/voucher.ts',
    ],
    adoptedFacts: [
      'voucher timing, total usage, per-user usage, and checkout constraints are independent rule lanes',
      'undefined/legacy voucher usage can be active until explicitly released/cancelled',
      'redemption keys must include tenant, voucher, order, and party dimensions',
    ],
    excludedFacts: [
      'project-specific voucher persistence model remains local',
    ],
  },
  {
    recipe: 'affiliate.direct.indirect',
    scope: 'modern-runtime',
    sourcePaths: [
      'OLD_CODE/apiv2_8721/src/tinhLaiPoint.ts',
      'OLD_CODE/crmv2_8801/src/models/api/commissionHistory.ts',
      'OLD_CODE/crmv2_8801/src/pages/CommissionHistory/FilterCommissionType.tsx',
    ],
    adoptedFacts: [
      'modern runtime keeps direct and indirect commission lanes',
      'commission side effects require deterministic idempotency keys',
    ],
    excludedFacts: [
      'leader/high-leader/outstanding/ambassador commissions are future title-program scope',
    ],
  },
  {
    recipe: 'title-programs.legacy',
    scope: 'future-title-program',
    sourcePaths: [
      'OLD_CODE/crm_9102/doar-react/packages/main/src/models/api/membershipConditions.type.ts',
      'OLD_CODE/crmv2_8801/src/models/api/commissionHistory.ts',
      'OLD_CODE/crmv2_8801/src/pages/CommissionHistory/CommissionHistory.tsx',
    ],
    adoptedFacts: [
      'legacy title programs exist and need a separate setup model in future',
    ],
    excludedFacts: [
      'title programs are not member rank conditions',
      'title commissions are not part of current modern affiliate runtime',
    ],
  },
] as const satisfies readonly DomainRecipeOldCodeSourceTrace[];

export function getOldCodeSourceTrace(recipe: string): DomainRecipeOldCodeSourceTrace | undefined {
  return DOMAIN_RECIPE_OLD_CODE_SOURCE_TRACE.find((item) => item.recipe === recipe);
}
