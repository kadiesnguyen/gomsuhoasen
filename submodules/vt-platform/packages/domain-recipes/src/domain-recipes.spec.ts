import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AffiliateCommissionType,
  LegacyTitleMembershipConditionType,
  LEGACY_TITLE_COMMISSION_TYPES,
  MembershipConditionType,
  MODERN_AFFILIATE_COMMISSION_TYPES,
  calculateAffiliateCommissions,
  createAffiliateCommissionIdempotencyKey,
  buildStorefrontLocationView,
  createSequentialReorderPlan,
  calculateAffiliateAvailableBalance,
  calculateAffiliateRefundReversal,
  buildAffiliateRefundCarryToken,
  readLatestAffiliateRefundCarry,
  AFFILIATE_COMMISSION_BALANCE_BUCKETS,
  AFFILIATE_COMMISSION_BALANCE_DEBIT_STATUSES,
  AFFILIATE_COMMISSION_BALANCE_MESSAGES,
  AFFILIATE_COMMISSION_REVERSIBLE_STATUSES,
  AFFILIATE_COMMISSION_STATUSES,
  canReverseAffiliateCommissionStatus,
  classifyAffiliateCommissionStatus,
  shouldDebitAffiliateCommissionBalance,
  VITA_REFERRAL_LOOKUP_ERRORS,
  summarizeAffiliateCommissionStatusTotals,
  calculateMembershipBalance,
  calculateMembershipFundAllocationBreakdown,
  allocateProportionalQuantities,
  calculateOrderScores,
  calculateStoreBillScores,
  createTransferEntries,
  evaluateMembershipConditions,
  isLegacyTitleCommissionType,
  isModernAffiliateCommissionType,
  normalizeMembershipBenefits,
  resolveMembershipTier,
  validateWithdrawalRequest,
  validateSequentialReorderInput,
  DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES,
  evaluateVoucherCheckoutRule,
  evaluateVoucherTimingRule,
  evaluateVoucherUsageRule,
  applyVoucherUsageDelta,
  createVoucherUsageRedeemPlan,
  createVoucherUsageReleasePlan,
  createVoucherRedemptionKey,
  isVoucherUsageActive,
  normalizeVoucherRedemptionState,
  normalizeVoucherRuleFailureReason,
  toVitaVoucherRuleFailureReason,
  V2_VOUCHER_FAILURE_REASON_VALUES,
  V2_VOUCHER_REDEMPTION_STATUS_VALUES,
  VITA_VOUCHER_CREATE_ERRORS,
  VITA_VOUCHER_CREATE_ERROR_VALUES,
  VITA_VOUCHER_FAILURE_REASONS,
  VITA_VOUCHER_FAILURE_REASON_VALUES,
  VITA_VOUCHER_USAGE_STATUSES,
  VITA_VOUCHER_USAGE_STATUS_VALUES,
  VOUCHER_TIMING_STATUS_DEFAULTS,
  VOUCHER_USAGE_REDEEM_DEFAULTS,
  VOUCHER_USAGE_RELEASE_DEFAULTS,
  VoucherRedemptionLifecycleState,
  VoucherRuleFailureReason,
  DEFAULT_WITHDRAWAL_RULES,
  MEMBERSHIP_LEDGER_STATUSES,
  MEMBERSHIP_LEDGER_STATUS_GROUPS,
  MEMBERSHIP_WALLET_NUMBER_MESSAGES,
  DOMAIN_RECIPE_OLD_CODE_SOURCE_TRACE,
  getOldCodeSourceTrace,
  MembershipFundAllocationInputError,
  ProportionalQuantityAllocationInputError,
} from './index';

test('membership condition matrix covers rank conditions and keeps title programs separate', () => {
  assert.equal(MembershipConditionType.PACKAGE_PURCHASED, 'PACKAGE_PURCHASED');
  assert.equal(MembershipConditionType.POINT_TOTAL, 'POINT_TOTAL');
  assert.equal(MembershipConditionType.PAID_TOTAL, 'PAID_TOTAL');
  assert.equal(MembershipConditionType.ORDER_COUNT, 'ORDER_COUNT');
  assert.equal(MembershipConditionType.ITEM_PURCHASED, 'ITEM_PURCHASED');
  assert.equal(MembershipConditionType.CUSTOM_FACT, 'CUSTOM_FACT');
  assert.equal(
    (MembershipConditionType as Record<string, string | undefined>).AFF_PERSONAL_MONTHLY_LEADER1_COMMISSION,
    undefined,
  );
  assert.equal(
    LegacyTitleMembershipConditionType.AFF_PERSONAL_MONTHLY_LEADER1_COMMISSION,
    'AFF_PERSONAL_MONTHLY_LEADER1_COMMISSION',
  );
});

test('evaluateMembershipConditions supports AND and OR flat policies', () => {
  const andResult = evaluateMembershipConditions(
    { memberId: 'member-a', metrics: { POINT_TOTAL: 350, ORDER_COUNT: 2 } },
    [
      { type: MembershipConditionType.POINT_TOTAL, group: 'AND', threshold: 300 },
      { type: MembershipConditionType.ORDER_COUNT, group: 'AND', threshold: 2 },
    ],
  );
  assert.equal(andResult.passed, true);
  assert.deepEqual(andResult.failedConditions, []);
  assert.deepEqual(andResult.progress.map((item) => item.percent), [100, 100]);

  const orResult = evaluateMembershipConditions(
    { memberId: 'member-a', metrics: { POINT_TOTAL: 350, INVITED_TOTAL: 2 } },
    [
      { type: MembershipConditionType.POINT_TOTAL, group: 'OR', threshold: 1000 },
      { type: MembershipConditionType.INVITED_TOTAL, group: 'OR', threshold: 2 },
    ],
  );
  assert.equal(orResult.passed, true);
  assert.deepEqual(orResult.passedConditions, [MembershipConditionType.INVITED_TOTAL]);
});

test('evaluateMembershipConditions rejects malformed metrics and thresholds', () => {
  assert.throws(
    () => evaluateMembershipConditions(
      { memberId: 'member-a', metrics: {} },
      [{ type: MembershipConditionType.POINT_TOTAL, group: 'AND', threshold: 300 }],
    ),
    /metrics\.POINT_TOTAL is required/,
  );

  assert.throws(
    () => evaluateMembershipConditions(
      { memberId: 'member-a', metrics: { POINT_TOTAL: Number.NaN } },
      [{ type: MembershipConditionType.POINT_TOTAL, group: 'AND', threshold: 300 }],
    ),
    /metrics\.POINT_TOTAL must be a finite non-negative number/,
  );

  assert.throws(
    () => evaluateMembershipConditions(
      { memberId: 'member-a', metrics: { POINT_TOTAL: 300 } },
      [{ type: MembershipConditionType.POINT_TOTAL, group: 'AND', threshold: -1 }],
    ),
    /POINT_TOTAL\.threshold must be a finite non-negative number/,
  );
});

test('calculateAffiliateCommissions calculates direct and indirect by default', () => {
  const result = calculateAffiliateCommissions({
    orderId: 'order-001',
    buyerId: 'buyer-a',
    targetId: 'tenant-a',
    totalPayment: 1_000_000,
    upline: [
      { memberId: 'direct-a', depth: 1 },
      { memberId: 'indirect-a', depth: 2 },
    ],
  });

  assert.deepEqual(result.ledger.map((entry) => ({
    key: entry.idempotencyKey,
    memberId: entry.memberId,
    type: entry.type,
    amount: entry.amount,
  })), [
    {
      key: 'commission:order-001:direct-a:DIRECT',
      memberId: 'direct-a',
      type: AffiliateCommissionType.DIRECT,
      amount: 100_000,
    },
    {
      key: 'commission:order-001:indirect-a:INDIRECT',
      memberId: 'indirect-a',
      type: AffiliateCommissionType.INDIRECT,
      amount: 70_000,
    },
  ]);
});

test('calculateAffiliateCommissions rejects malformed totalPayment instead of falling back to zero', () => {
  assert.throws(
    () => calculateAffiliateCommissions({
      orderId: 'order-malformed',
      buyerId: 'buyer-a',
      targetId: 'tenant-a',
      totalPayment: Number.NaN,
      upline: [{ memberId: 'direct-a', depth: 1 }],
    }),
    /totalPayment must be a finite non-negative number/,
  );

  assert.throws(
    () => calculateAffiliateCommissions({
      orderId: 'order-negative',
      buyerId: 'buyer-a',
      targetId: 'tenant-a',
      totalPayment: -1,
      upline: [{ memberId: 'direct-a', depth: 1 }],
    }),
    /totalPayment must be a finite non-negative number/,
  );

  const result = calculateAffiliateCommissions({
    orderId: 'order-zero',
    buyerId: 'buyer-a',
    targetId: 'tenant-a',
    totalPayment: 0,
    upline: [{ memberId: 'direct-a', depth: 1 }],
  });
  assert.deepEqual(result, { ledger: [], metricIncrements: [] });
});

test('calculateMembershipFundAllocationBreakdown allocates explicit fund percentages', () => {
  const breakdown = calculateMembershipFundAllocationBreakdown({
    paidPrice: 100_000,
    fundAllocation: {
      referrerDirectRewardPercent: 10,
      nationalShare1Percent: 5,
      nationalShare2Percent: 0,
      nationalShare3Percent: 0,
      regionalShare1Percent: 15,
      regionalShare2Percent: 0,
      regionalShare3Percent: 0,
    },
  });

  assert.deepEqual(breakdown, {
    referrerDirect: 10_000,
    regionShared: 15_000,
    eventFund: 5_000,
    tenantRevenue: 70_000,
    totalPercent: 30,
  });
});

test('calculateMembershipFundAllocationBreakdown rejects incomplete or over-budget percentages', () => {
  assert.throws(
    () => calculateMembershipFundAllocationBreakdown({
      paidPrice: 100_000,
      fundAllocation: {
        referrerDirectRewardPercent: 10,
        nationalShare1Percent: 5,
        nationalShare2Percent: 0,
        regionalShare1Percent: 15,
        regionalShare2Percent: 0,
        regionalShare3Percent: 0,
      },
    }),
    (error) => error instanceof MembershipFundAllocationInputError
      && error.fieldName === 'fundAllocation.nationalShare3Percent',
  );

  assert.throws(
    () => calculateMembershipFundAllocationBreakdown({
      paidPrice: 100_000,
      fundAllocation: {
        referrerDirectRewardPercent: 60,
        nationalShare1Percent: 30,
        nationalShare2Percent: 0,
        nationalShare3Percent: 0,
        regionalShare1Percent: 20,
        regionalShare2Percent: 0,
        regionalShare3Percent: 0,
      },
    }),
    (error) => error instanceof MembershipFundAllocationInputError
      && error.fieldName === 'fundAllocation.percentTotal',
  );
});

test('allocateProportionalQuantities distributes floor remainders deterministically', () => {
  const allocation = allocateProportionalQuantities({
    ratio: 0.5,
    lines: [
      { payload: { productId: 'product-b' }, quantity: 1, tieBreaker: 'product-b' },
      { payload: { productId: 'product-a' }, quantity: 3, tieBreaker: 'product-a' },
    ],
  });

  assert.deepEqual(allocation, [
    { payload: { productId: 'product-a' }, quantity: 2 },
  ]);
});

test('allocateProportionalQuantities keeps zero ratios empty and full ratios capped to source quantities', () => {
  assert.deepEqual(allocateProportionalQuantities({
    ratio: 0,
    lines: [
      { payload: { productId: 'product-a' }, quantity: 3, tieBreaker: 'product-a' },
    ],
  }), []);

  assert.deepEqual(allocateProportionalQuantities({
    ratio: 1.5,
    lines: [
      { payload: { productId: 'product-a' }, quantity: 3, tieBreaker: 'product-a' },
    ],
  }), [
    { payload: { productId: 'product-a' }, quantity: 3 },
  ]);
});

test('allocateProportionalQuantities rejects malformed quantities and ratios', () => {
  assert.throws(
    () => allocateProportionalQuantities({
      ratio: -0.1,
      lines: [
        { payload: { productId: 'product-a' }, quantity: 3, tieBreaker: 'product-a' },
      ],
    }),
    (error) => error instanceof ProportionalQuantityAllocationInputError
      && error.fieldName === 'ratio',
  );

  assert.throws(
    () => allocateProportionalQuantities({
      ratio: 0.5,
      lines: [
        { payload: { productId: 'product-a' }, quantity: 0, tieBreaker: 'product-a' },
      ],
    }),
    (error) => error instanceof ProportionalQuantityAllocationInputError
      && error.fieldName === 'lines[0].quantity',
  );
});

test('createAffiliateCommissionIdempotencyKey can scope keys by tenant for runtime storage', () => {
  assert.equal(
    createAffiliateCommissionIdempotencyKey({
      tenantId: 'tenant-001',
      orderId: 'order-001',
      memberId: 'direct-a',
      type: AffiliateCommissionType.DIRECT,
    }),
    'commission:tenant-001:order-001:direct-a:DIRECT',
  );
});

test('calculateAffiliateCommissions excludes legacy title commissions from modern runtime', () => {
  const result = calculateAffiliateCommissions({
    orderId: 'order-002',
    buyerId: 'buyer-a',
    targetId: 'tenant-a',
    totalPayment: 1_000_000,
    upline: [
      { memberId: 'direct-a', depth: 1 },
      { memberId: 'indirect-a', depth: 2 },
    ],
    enabled: { direct: false, indirect: false },
  });
  assert.deepEqual(result.ledger, []);
  assert.equal(AffiliateCommissionType.LEADER1, 'LEADER1');
});

test('calculateAffiliateCommissions records OLD_CODE direct and indirect metric lanes', () => {
  const result = calculateAffiliateCommissions({
    orderId: 'order-003',
    buyerId: 'buyer-a',
    targetId: 'tenant-a',
    totalPayment: 1_000_000,
    upline: [
      { memberId: 'direct-a', depth: 1 },
      { memberId: 'indirect-a', depth: 2 },
    ],
  });

  assert.deepEqual(result.metricIncrements.map((metric) => ({
    memberId: metric.memberId,
    type: metric.type,
    amount: metric.amount,
  })), [
    { memberId: 'direct-a', type: MembershipConditionType.AFF_PERSONAL_MONTHLY_DIRECT_COMMISSION, amount: 100_000 },
    { memberId: 'direct-a', type: MembershipConditionType.AFF_PERSONAL_ACCUMULATED_DIRECT_COMMISSION, amount: 100_000 },
    { memberId: 'direct-a', type: MembershipConditionType.AFF_PERSONAL_ACCUMULATED_COMMISSION, amount: 100_000 },
    { memberId: 'direct-a', type: MembershipConditionType.AFF_PERSONAL_MONTHLY_DIRECT_REVENUE, amount: 1_000_000 },
    { memberId: 'direct-a', type: MembershipConditionType.AFF_PERSONAL_ACCUMULATED_DIRECT_REVENUE, amount: 1_000_000 },
    { memberId: 'indirect-a', type: MembershipConditionType.AFF_PERSONAL_MONTHLY_INDIRECT_COMMISSION, amount: 70_000 },
    { memberId: 'indirect-a', type: MembershipConditionType.AFF_PERSONAL_ACCUMULATED_INDIRECT_COMMISSION, amount: 70_000 },
    { memberId: 'indirect-a', type: MembershipConditionType.AFF_PERSONAL_ACCUMULATED_COMMISSION, amount: 70_000 },
    { memberId: 'indirect-a', type: MembershipConditionType.AFF_PERSONAL_MONTHLY_INDIRECT_REVENUE, amount: 1_000_000 },
    { memberId: 'indirect-a', type: MembershipConditionType.AFF_PERSONAL_ACCUMULATED_INDIRECT_REVENUE, amount: 1_000_000 },
  ]);
});

test('affiliate commission type classifier separates modern runtime from future title programs', () => {
  assert.deepEqual(MODERN_AFFILIATE_COMMISSION_TYPES, [
    AffiliateCommissionType.DIRECT,
    AffiliateCommissionType.INDIRECT,
  ]);
  assert.equal(isModernAffiliateCommissionType(AffiliateCommissionType.DIRECT), true);
  assert.equal(isModernAffiliateCommissionType(AffiliateCommissionType.INDIRECT), true);

  for (const type of LEGACY_TITLE_COMMISSION_TYPES) {
    assert.equal(isModernAffiliateCommissionType(type), false);
    assert.equal(isLegacyTitleCommissionType(type), true);
  }
});

test('VITA referral lookup errors keep lower-snake wire values behind keyed constants', () => {
  assert.deepEqual(Object.values(VITA_REFERRAL_LOOKUP_ERRORS), [
    'not_found',
    'self_referral',
    'locked_account',
  ]);
});

test('summarizeAffiliateCommissionStatusTotals keeps pending, available, paid, and ignored lanes deterministic', () => {
  assert.deepEqual(AFFILIATE_COMMISSION_REVERSIBLE_STATUSES, [
    AFFILIATE_COMMISSION_STATUSES.PENDING,
    AFFILIATE_COMMISSION_STATUSES.APPROVED,
    AFFILIATE_COMMISSION_STATUSES.PAID,
  ]);
  assert.deepEqual(AFFILIATE_COMMISSION_BALANCE_DEBIT_STATUSES, [
    AFFILIATE_COMMISSION_STATUSES.PAID,
  ]);
  assert.equal(canReverseAffiliateCommissionStatus(AFFILIATE_COMMISSION_STATUSES.PENDING), true);
  assert.equal(canReverseAffiliateCommissionStatus(AFFILIATE_COMMISSION_STATUSES.APPROVED), true);
  assert.equal(canReverseAffiliateCommissionStatus(AFFILIATE_COMMISSION_STATUSES.PAID), true);
  assert.equal(canReverseAffiliateCommissionStatus(AFFILIATE_COMMISSION_STATUSES.PAYABLE), false);
  assert.equal(shouldDebitAffiliateCommissionBalance(AFFILIATE_COMMISSION_STATUSES.PAID), true);
  assert.equal(shouldDebitAffiliateCommissionBalance(AFFILIATE_COMMISSION_STATUSES.APPROVED), false);

  assert.equal(
    classifyAffiliateCommissionStatus(AFFILIATE_COMMISSION_STATUSES.PENDING),
    AFFILIATE_COMMISSION_BALANCE_BUCKETS.PENDING,
  );
  assert.equal(
    classifyAffiliateCommissionStatus(AFFILIATE_COMMISSION_STATUSES.APPROVED),
    AFFILIATE_COMMISSION_BALANCE_BUCKETS.PENDING,
  );
  assert.equal(
    classifyAffiliateCommissionStatus(AFFILIATE_COMMISSION_STATUSES.PAYABLE),
    AFFILIATE_COMMISSION_BALANCE_BUCKETS.AVAILABLE,
  );
  assert.equal(
    classifyAffiliateCommissionStatus(AFFILIATE_COMMISSION_STATUSES.PAID),
    AFFILIATE_COMMISSION_BALANCE_BUCKETS.PAID,
  );
  assert.equal(classifyAffiliateCommissionStatus('FRAUD_HOLD'), AFFILIATE_COMMISSION_BALANCE_BUCKETS.IGNORED);

  assert.deepEqual(summarizeAffiliateCommissionStatusTotals([
    { status: AFFILIATE_COMMISSION_STATUSES.PENDING, total: 100_000, count: 1 },
    { status: AFFILIATE_COMMISSION_STATUSES.APPROVED, total: 50_000, count: 2 },
    { status: AFFILIATE_COMMISSION_STATUSES.PAYABLE, total: 200_000, count: 1 },
    { status: AFFILIATE_COMMISSION_STATUSES.PAID, total: 300_000, count: 1 },
    { status: 'REVERSED', total: 999_999, count: 3 },
  ]), {
    pending: { total: 150_000, count: 3 },
    available: { total: 200_000, count: 1 },
    paid: { total: 300_000, count: 1 },
    ignored: { total: 999_999, count: 3 },
    totalCount: 8,
  });
});

test('summarizeAffiliateCommissionStatusTotals rejects malformed aggregate totals instead of falling back to zero', () => {
  assert.throws(
    () => summarizeAffiliateCommissionStatusTotals([
      { status: AFFILIATE_COMMISSION_STATUSES.PENDING, total: Number.NaN, count: 1 },
    ]),
    /affiliate commission total must be a finite non-negative number/,
  );

  assert.throws(
    () => summarizeAffiliateCommissionStatusTotals([
      { status: AFFILIATE_COMMISSION_STATUSES.PENDING, total: 100_000, count: -1 },
    ]),
    /affiliate commission count must be a finite non-negative number/,
  );
});

test('calculateAffiliateAvailableBalance rejects overdrawn or malformed withdrawal aggregates', () => {
  assert.equal(calculateAffiliateAvailableBalance({
    totalEarned: 12_000,
    totalWithdrawn: 4_000,
    withdrawingAmount: 500,
  }), 7_500);

  assert.throws(
    () => calculateAffiliateAvailableBalance({
      totalEarned: 1_000,
      totalWithdrawn: 1_000,
      withdrawingAmount: 1,
    }),
    new RegExp(AFFILIATE_COMMISSION_BALANCE_MESSAGES.COMPONENTS_EXCEED_TOTAL_EARNED),
  );

  assert.throws(
    () => calculateAffiliateAvailableBalance({
      totalEarned: 1_000,
      totalWithdrawn: Number.NaN,
      withdrawingAmount: 0,
    }),
    /affiliate total withdrawn must be a finite non-negative number/,
  );
});

test('calculateAffiliateRefundReversal preserves proportional refund carry without clamps', () => {
  const first = calculateAffiliateRefundReversal({
    refundType: 'PARTIAL',
    finalAmount: 7,
    reversedAmount: 0,
    refundAmount: 3,
    orderAmount: 10,
    previousCarry: 0,
  });
  assert.deepEqual(first, {
    amount: 2,
    carry: 1,
    finalAmount: 7,
    currentReversedAmount: 0,
    nextReversedAmount: 2,
    fullyReversed: false,
  });

  const second = calculateAffiliateRefundReversal({
    refundType: 'PARTIAL',
    finalAmount: 7,
    reversedAmount: first.nextReversedAmount,
    refundAmount: 3,
    orderAmount: 10,
    previousCarry: first.carry,
  });
  assert.deepEqual(second, {
    amount: 2,
    carry: 2,
    finalAmount: 7,
    currentReversedAmount: 2,
    nextReversedAmount: 4,
    fullyReversed: false,
  });

  const final = calculateAffiliateRefundReversal({
    refundType: 'PARTIAL',
    finalAmount: 7,
    reversedAmount: second.nextReversedAmount,
    refundAmount: 4,
    orderAmount: 10,
    previousCarry: second.carry,
  });
  assert.deepEqual(final, {
    amount: 3,
    carry: 0,
    finalAmount: 7,
    currentReversedAmount: 4,
    nextReversedAmount: 7,
    fullyReversed: true,
  });
});

test('calculateAffiliateRefundReversal rejects malformed monetary and carry inputs', () => {
  assert.throws(
    () => calculateAffiliateRefundReversal({
      refundType: 'PARTIAL',
      finalAmount: 10_000,
      reversedAmount: 0,
      refundAmount: -1,
      orderAmount: 100_000,
      previousCarry: 0,
    }),
    /affiliate refund amount must be a finite non-negative number/,
  );

  assert.throws(
    () => calculateAffiliateRefundReversal({
      refundType: 'PARTIAL',
      finalAmount: 10_000,
      reversedAmount: 11_000,
      refundAmount: 1_000,
      orderAmount: 100_000,
      previousCarry: 0,
    }),
    /affiliate refund reversed amount exceeds final amount/,
  );

  assert.throws(
    () => calculateAffiliateRefundReversal({
      refundType: 'PARTIAL',
      finalAmount: 10_000,
      reversedAmount: 0,
      refundAmount: 1_000,
      orderAmount: 100_000,
      previousCarry: 0.5,
    }),
    /affiliate refund carry must be a safe non-negative integer/,
  );
});

test('affiliate refund carry tokens reject malformed persisted state', () => {
  assert.equal(buildAffiliateRefundCarryToken(12), '[refundCarry:12]');
  assert.equal(readLatestAffiliateRefundCarry([
    'older [refundCarry:3]',
    undefined,
    'newer [refundCarry:8]',
  ]), 8);
  assert.equal(readLatestAffiliateRefundCarry(['no carry token']), 0);

  assert.throws(
    () => buildAffiliateRefundCarryToken(-1),
    /affiliate refund carry must be a safe non-negative integer/,
  );

  assert.throws(
    () => readLatestAffiliateRefundCarry(['broken [refundCarry:abc]']),
    /affiliate refund carry token is invalid/,
  );
});

test('buildStorefrontLocationView normalizes optional public store metadata', () => {
  assert.deepEqual(
    buildStorefrontLocationView({
      path: 'SHOWROOM/HCM/Q1',
      name: ' Showroom Q1 ',
      publicAddress: ' 123 Le Loi ',
      zone: ' HCM ',
      thumbnailUri: ' https://cdn.test/store.png ',
      hotline: ' 1900 1234 ',
      openingTime: '8:30',
      closingTime: ' 21:00 ',
      province: { code: '79', name: 'Ho Chi Minh' },
      district: { code: '760', name: 'Quan 1' },
      ward: { code: '26734', name: 'Ben Nghe' },
    }),
    {
      name: 'Showroom Q1',
      address: '123 Le Loi',
      zone: 'HCM',
      thumbnailUri: 'https://cdn.test/store.png',
      hotline: '1900 1234',
      openingTime: '08:30',
      closingTime: '21:00',
      province: { code: '79', name: 'Ho Chi Minh', title: 'Ho Chi Minh' },
      district: { code: '760', name: 'Quan 1', title: 'Quan 1' },
      ward: { code: '26734', name: 'Ben Nghe', title: 'Ben Nghe' },
    },
  );
});

test('sequential reorder helpers reject duplicate ids and build deterministic positions', () => {
  assert.deepEqual(validateSequentialReorderInput(['a', 'b', 'a'], 3), {
    valid: false,
    duplicateIds: ['a'],
    invalidBaseVersion: false,
  });
  assert.equal(validateSequentialReorderInput(['a'], -1).invalidBaseVersion, true);
  assert.deepEqual(createSequentialReorderPlan(['a', 'b'], 3), {
    baseVersion: 3,
    nextVersion: 4,
    steps: [
      { id: 'a', position: 0, baseVersion: 3, nextVersion: 4 },
      { id: 'b', position: 1, baseVersion: 3, nextVersion: 4 },
    ],
  });
});

test('normalizeMembershipBenefits applies OLD_CODE enable flags without model hooks', () => {
  assert.deepEqual(normalizeMembershipBenefits({
    enableDiscountPercent: false,
    discountPercent: 15,
    enableAllowWithdraw: false,
    allowWithdraw: true,
    enableCommissions: false,
    commissions: 10,
    enableSelfPoint: true,
    selfPoint: 25,
  }), {
    discountPercent: 0,
    allowWithdraw: false,
    commissionRate: 0,
    selfPointRate: 25,
    pointsMultiplier: 1.25,
  });
});

test('normalizeMembershipBenefits keeps safe defaults for disabled and missing benefit flags', () => {
  assert.deepEqual(normalizeMembershipBenefits(), {
    discountPercent: 0,
    allowWithdraw: false,
    commissionRate: 0,
    selfPointRate: 0,
    pointsMultiplier: 1,
  });
  assert.deepEqual(normalizeMembershipBenefits({
    discountPercent: 80,
    commissions: 5,
    selfPoint: 10,
    allowWithdraw: true,
  }), {
    discountPercent: 80,
    allowWithdraw: true,
    commissionRate: 5,
    selfPointRate: 10,
    pointsMultiplier: 1.1,
  });
});

test('normalizeMembershipBenefits rejects malformed enabled benefit values', () => {
  assert.throws(
    () => normalizeMembershipBenefits({ discountPercent: 120 }),
    /discountPercent must be a percentage between 0 and 100/,
  );
  assert.throws(
    () => normalizeMembershipBenefits({ commissions: -5 }),
    /commissions must be a finite non-negative number/,
  );
  assert.throws(
    () => normalizeMembershipBenefits({ enableSelfPoint: true, selfPoint: Number.NaN }),
    /selfPoint must be a finite non-negative number/,
  );
});

test('resolveMembershipTier picks highest eligible tier and does not downgrade', () => {
  const result = resolveMembershipTier(
    { memberId: 'member-a', metrics: { POINT_TOTAL: 1_200, ORDER_COUNT: 4 } },
    [
      { id: 'level-1', title: 'Level 1', level: 1, isDefault: true },
      {
        id: 'level-2',
        title: 'Level 2',
        level: 2,
        conditions: [{ type: MembershipConditionType.POINT_TOTAL, group: 'AND', threshold: 500 }],
        benefits: { enableSelfPoint: true, selfPoint: 15 },
      },
      {
        id: 'level-3',
        title: 'Level 3',
        level: 3,
        conditions: [
          { type: MembershipConditionType.POINT_TOTAL, group: 'AND', threshold: 1_000 },
          { type: MembershipConditionType.ORDER_COUNT, group: 'AND', threshold: 3 },
        ],
        benefits: { enableDiscountPercent: true, discountPercent: 10 },
      },
    ],
    'level-1',
  );

  assert.equal(result.action, 'upgrade');
  assert.equal(result.selectedTier.id, 'level-3');
  assert.equal(result.selectedBenefits.discountPercent, 10);
});

test('resolveMembershipTier rejects ambiguous tier priority and condition defaults', () => {
  assert.throws(
    () => resolveMembershipTier(
      { memberId: 'member-a', metrics: { POINT_TOTAL: 1_200 } },
      [
        { id: 'level-1', title: 'Level 1', level: 1, isDefault: true },
        { id: 'level-2', title: 'Level 2', isDefault: false },
      ],
      'level-1',
    ),
    /Membership tier level-2 requires level or position/,
  );

  assert.throws(
    () => resolveMembershipTier(
      { memberId: 'member-a', metrics: { POINT_TOTAL: 1_200 } },
      [
        { id: 'level-1', title: 'Level 1', level: 1, isDefault: true },
        { id: 'level-2', title: 'Level 2', level: 2 },
      ],
      'level-1',
    ),
    /Membership tier level-2 requires conditions unless it is default/,
  );

  assert.throws(
    () => resolveMembershipTier(
      { memberId: 'member-a', metrics: { POINT_TOTAL: 1_200 } },
      [{ id: 'level-1', title: 'Level 1', level: 1, isDefault: true }],
      'missing-level',
    ),
    /Current membership tier missing-level was not found/,
  );
});

test('calculateOrderScores returns deterministic per-source score ids', () => {
  const entries = calculateOrderScores({
    order_id: 'order-001',
    buyer_member_id: 'buyer-a',
    vitath_member_id: 'vitath-sink',
    referrer_member_id: 'ref-a',
    order_amount: 1_000_000,
    buyer_level: 3,
  });

  assert.deepEqual(entries.map((entry) => ({
    id: entry.score_id,
    type: entry.score_type,
    amount: entry.amount,
  })), [
    { id: 'score:order:order-001:buyer-a:BUYER', type: 'BUYER', amount: 250_000 },
    { id: 'score:order:order-001:ref-a:REFERRER', type: 'REFERRER', amount: 30_000 },
    { id: 'score:order:order-001:vitath-sink:VITATH', type: 'VITATH', amount: 72_000 },
  ]);
});

test('calculateOrderScores requires an explicit VITATH sink member', () => {
  assert.throws(
    () => calculateOrderScores({
      order_id: 'order-001',
      buyer_member_id: 'buyer-a',
      vitath_member_id: ' ',
      order_amount: 1_000_000,
      buyer_level: 3,
    }),
    /vitath_member_id is required/,
  );
});

test('calculateOrderScores rejects missing level-specific score rates', () => {
  assert.throws(
    () => calculateOrderScores(
      {
        order_id: 'order-001',
        buyer_member_id: 'buyer-a',
        vitath_member_id: 'vitath-sink',
        order_amount: 1_000_000,
        buyer_level: 3,
      },
      {
        buyer_rates: { 1: 0.1, 2: 0.2 },
        voucher_rates: { 1: 0.03, 2: 0.05, 3: 0.08 },
        referrer_rates: { 1: 0.01, 2: 0.02, 3: 0.03 },
        owner_rate: 0.1,
        employee_rate: 0.02,
      },
    ),
    /buyer rate is required for level 3/,
  );
});

test('calculateOrderScores rejects malformed order score inputs', () => {
  assert.throws(
    () => calculateOrderScores({
      order_id: 'order-001',
      buyer_member_id: 'buyer-a',
      vitath_member_id: 'vitath-sink',
      order_amount: Number.NaN,
      buyer_level: 3,
    }),
    /order_amount must be a finite non-negative number/,
  );

  assert.throws(
    () => calculateOrderScores({
      order_id: 'order-001',
      buyer_member_id: 'buyer-a',
      vitath_member_id: 'vitath-sink',
      order_amount: 1_000_000,
      buyer_level: 0,
    }),
    /buyer_level must be a positive integer/,
  );
});

test('calculateStoreBillScores uses explicit VITATH and TGD sink members', () => {
  const entries = calculateStoreBillScores({
    bill_id: 'bill-001',
    store_id: 'store-a',
    payer_member_id: 'payer-a',
    owner_member_id: 'owner-a',
    vitath_member_id: 'vitath-sink',
    tgd_member_id: 'tgd-sink',
    amount: 1_000_000,
    vita_cut_percentage: 10,
    payer_level: 3,
    owner_level: 4,
  });

  assert.ok(entries.some((entry) => entry.member_id === 'vitath-sink' && entry.score_type === 'VITATH_STORE'));
  assert.ok(entries.some((entry) => entry.member_id === 'vitath-sink' && entry.score_type === 'VITATH_POOL'));
  assert.ok(entries.some((entry) => entry.member_id === 'tgd-sink' && entry.score_type === 'TGD_VITA'));
});

test('calculateStoreBillScores requires explicit company sink members', () => {
  assert.throws(
    () => calculateStoreBillScores({
      bill_id: 'bill-001',
      store_id: 'store-a',
      payer_member_id: 'payer-a',
      owner_member_id: 'owner-a',
      vitath_member_id: 'vitath-sink',
      tgd_member_id: ' ',
      amount: 1_000_000,
      vita_cut_percentage: 10,
      payer_level: 3,
      owner_level: 4,
    }),
    /tgd_member_id is required/,
  );
});

test('calculateStoreBillScores rejects missing pool usage percentage', () => {
  assert.throws(
    () => calculateStoreBillScores(
      {
        bill_id: 'bill-001',
        store_id: 'store-a',
        payer_member_id: 'payer-a',
        owner_member_id: 'owner-a',
        vitath_member_id: 'vitath-sink',
        tgd_member_id: 'tgd-sink',
        amount: 1_000_000,
        vita_cut_percentage: 10,
        payer_level: 3,
        owner_level: 4,
      },
      undefined,
      [],
    ),
    /pool point_usage_percentage is required/,
  );
});

test('calculateStoreBillScores rejects malformed monetary and percentage inputs', () => {
  assert.throws(
    () => calculateStoreBillScores({
      bill_id: 'bill-001',
      store_id: 'store-a',
      payer_member_id: 'payer-a',
      owner_member_id: 'owner-a',
      vitath_member_id: 'vitath-sink',
      tgd_member_id: 'tgd-sink',
      amount: -1,
      vita_cut_percentage: 10,
      payer_level: 3,
      owner_level: 4,
    }),
    /amount must be a finite non-negative number/,
  );

  assert.throws(
    () => calculateStoreBillScores({
      bill_id: 'bill-001',
      store_id: 'store-a',
      payer_member_id: 'payer-a',
      owner_member_id: 'owner-a',
      vitath_member_id: 'vitath-sink',
      tgd_member_id: 'tgd-sink',
      amount: 1_000_000,
      vita_cut_percentage: 101,
      payer_level: 3,
      owner_level: 4,
    }),
    /vita_cut_percentage must be a percentage between 0 and 100/,
  );
});

test('calculateStoreBillScores rejects malformed score distribution config', () => {
  assert.throws(
    () => calculateStoreBillScores(
      {
        bill_id: 'bill-001',
        store_id: 'store-a',
        payer_member_id: 'payer-a',
        owner_member_id: 'owner-a',
        vitath_member_id: 'vitath-sink',
        tgd_member_id: 'tgd-sink',
        amount: 1_000_000,
        vita_cut_percentage: 10,
        payer_level: 3,
        owner_level: 4,
      },
      {
        buyer_rates: { 1: 0.1, 2: 0.15, 3: 0.25, 4: 0.35, 5: 0.5 },
        voucher_rates: { 1: 0.03, 2: 0.05, 3: 0.08, 4: 0.1, 5: 0.15 },
        referrer_rates: { 1: 0.01, 2: 0.02, 3: 0.03, 4: 0.04, 5: 0.05 },
        owner_rate: Number.NaN,
        employee_rate: 0.02,
      },
    ),
    /owner_rate must be a finite non-negative number/,
  );

  assert.throws(
    () => calculateStoreBillScores(
      {
        bill_id: 'bill-001',
        store_id: 'store-a',
        payer_member_id: 'payer-a',
        owner_member_id: 'owner-a',
        vitath_member_id: 'vitath-sink',
        tgd_member_id: 'tgd-sink',
        amount: 1_000_000,
        vita_cut_percentage: 10,
        payer_level: 3,
        owner_level: 4,
      },
      undefined,
      [{ pool_id: 'pool_1', pool_name: 'Pool 1', percentage: 101, eligible_min_level: 1, point_usage_percentage: 5 }],
    ),
    /pool_1\.percentage must be a percentage between 0 and 100/,
  );
});

test('calculateStoreBillScores rejects malformed pool recipients instead of unallocated level fallback', () => {
  assert.throws(
    () => calculateStoreBillScores({
      bill_id: 'bill-001',
      store_id: 'store-a',
      payer_member_id: 'payer-a',
      owner_member_id: 'owner-a',
      vitath_member_id: 'vitath-sink',
      tgd_member_id: 'tgd-sink',
      amount: 1_000_000,
      vita_cut_percentage: 10,
      payer_level: 3,
      owner_level: 4,
      pool_recipients: [{ pool_id: 'pool_1', member_id: ' ', level: 5 }],
    }),
    /pool_recipients\[0\]\.member_id is required/,
  );

  assert.throws(
    () => calculateStoreBillScores({
      bill_id: 'bill-001',
      store_id: 'store-a',
      payer_member_id: 'payer-a',
      owner_member_id: 'owner-a',
      vitath_member_id: 'vitath-sink',
      tgd_member_id: 'tgd-sink',
      amount: 1_000_000,
      vita_cut_percentage: 10,
      payer_level: 3,
      owner_level: 4,
      pool_recipients: [{ pool_id: 'pool_1', member_id: 'pool-member-a', level: 0 }],
    }),
    /pool_recipients\[0\]\.level must be a positive integer/,
  );
});

test('createTransferEntries generates a unique transfer source when no id is supplied', () => {
  const [firstDebit, firstCredit] = createTransferEntries('from-a', 'to-a', 50_000, 3, 2);
  const [secondDebit, secondCredit] = createTransferEntries('from-a', 'to-a', 50_000, 3, 2);

  assert.equal(firstDebit.source_id, firstCredit.source_id);
  assert.equal(secondDebit.source_id, secondCredit.source_id);
  assert.notEqual(firstDebit.source_id, secondDebit.source_id);
  assert.notEqual(firstDebit.score_id, secondDebit.score_id);
});

test('createTransferEntries preserves double-entry invariants for deterministic replay ids', () => {
  const [debit, credit] = createTransferEntries('from-a', 'to-a', 50_000, 3, 2, 'transfer-fixed-001');

  assert.equal(debit.source_id, 'transfer-fixed-001');
  assert.equal(credit.source_id, 'transfer-fixed-001');
  assert.equal(debit.score_id, 'score:transfer:transfer-fixed-001:from-a:TRANSFER_OUT');
  assert.equal(credit.score_id, 'score:transfer:transfer-fixed-001:to-a:TRANSFER_IN');
  assert.equal(debit.amount + credit.amount, 0);
  assert.deepEqual([debit.related_member_id, credit.related_member_id], [undefined, undefined]);
});

test('calculateMembershipBalance and validateWithdrawalRequest cover available and pending lanes', () => {
  const balance = calculateMembershipBalance([
    { amount: 500_000, status: MEMBERSHIP_LEDGER_STATUSES.COMPLETED, bucket: 'reward' },
    { amount: 100_000, status: MEMBERSHIP_LEDGER_STATUSES.PENDING, bucket: 'reward' },
    { amount: -50_000, status: MEMBERSHIP_LEDGER_STATUSES.COMPLETED, bucket: 'reward' },
    { amount: 999_999, status: MEMBERSHIP_LEDGER_STATUSES.CANCELLED, bucket: 'reward' },
  ]);
  assert.equal(balance.available, 450_000);
  assert.equal(balance.pending, 100_000);
  assert.equal(balance.buckets.reward.total, 550_000);

  const validation = validateWithdrawalRequest({
    amount: 200_000,
    available_balance: balance.available,
    pending_today_count: 0,
    has_bank_info: true,
  });
  assert.equal(validation.valid, true);
  assert.equal(validation.preview.net_amount, 197_800);
});

test('calculateMembershipBalance separates available, pending, and ignored failed lanes by bucket', () => {
  const balance = calculateMembershipBalance([
    { amount: 1_000_000, status: MEMBERSHIP_LEDGER_STATUSES.COMPLETED, bucket: 'commission' },
    { amount: 200_000, status: MEMBERSHIP_LEDGER_STATUSES.PAID, bucket: 'commission' },
    { amount: 150_000, status: MEMBERSHIP_LEDGER_STATUSES.PENDING, bucket: 'commission' },
    { amount: 50_000, status: MEMBERSHIP_LEDGER_STATUSES.APPROVED, bucket: 'reward' },
    { amount: 999_999, status: MEMBERSHIP_LEDGER_STATUSES.FAILED, bucket: 'commission' },
    { amount: 999_999, status: MEMBERSHIP_LEDGER_STATUSES.REJECTED, bucket: 'reward' },
  ]);

  assert.equal(balance.available, 1_200_000);
  assert.equal(balance.pending, 200_000);
  assert.equal(balance.total, 1_400_000);
  assert.deepEqual(balance.buckets.commission, {
    available: 1_200_000,
    pending: 150_000,
    locked: 0,
    total: 1_350_000,
  });
  assert.deepEqual(balance.buckets.reward, {
    available: 0,
    pending: 50_000,
    locked: 0,
    total: 50_000,
  });
});

test('calculateMembershipBalance rejects malformed ledger entries instead of bucket fallbacks', () => {
  assert.deepEqual(MEMBERSHIP_LEDGER_STATUS_GROUPS.AVAILABLE, [
    MEMBERSHIP_LEDGER_STATUSES.COMPLETED,
    MEMBERSHIP_LEDGER_STATUSES.PAID,
  ]);
  assert.deepEqual(MEMBERSHIP_LEDGER_STATUS_GROUPS.PENDING, [
    MEMBERSHIP_LEDGER_STATUSES.PENDING,
    MEMBERSHIP_LEDGER_STATUSES.APPROVED,
  ]);

  assert.throws(
    () => calculateMembershipBalance([
      { amount: 100_000, status: MEMBERSHIP_LEDGER_STATUSES.COMPLETED, bucket: ' ' },
    ]),
    new RegExp(MEMBERSHIP_WALLET_NUMBER_MESSAGES.LEDGER_BUCKET_REQUIRED),
  );

  assert.throws(
    () => calculateMembershipBalance([
      { amount: Number.NaN, status: MEMBERSHIP_LEDGER_STATUSES.COMPLETED, bucket: 'reward' },
    ]),
    new RegExp(`membership ledger amount ${MEMBERSHIP_WALLET_NUMBER_MESSAGES.FINITE_NUMBER}`),
  );

  assert.throws(
    () => calculateMembershipBalance([
      { amount: 100_000, status: 'unknown' as never, bucket: 'reward' },
    ]),
    new RegExp(MEMBERSHIP_WALLET_NUMBER_MESSAGES.UNSUPPORTED_LEDGER_STATUS_PREFIX),
  );
});

test('validateWithdrawalRequest reports all blocking withdrawal errors deterministically', () => {
  const result = validateWithdrawalRequest({
    amount: 100_000,
    available_balance: 100_000,
    pending_today_count: 1,
    has_bank_info: false,
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'below_minimum',
    'exceeds_maximum',
    'daily_limit_reached',
    'bank_info_missing',
  ]);
  assert.deepEqual(result.preview, {
    gross_amount: 100_000,
    fee: 1_000,
    vat: 100,
    total_deduction: 1_100,
    net_amount: 98_900,
    remaining_balance: 0,
  });
});

test('validateWithdrawalRequest rejects malformed numeric inputs and rules', () => {
  assert.throws(
    () => validateWithdrawalRequest({
      amount: -1,
      available_balance: 100_000,
      pending_today_count: 0,
      has_bank_info: true,
    }),
    new RegExp(`withdrawal amount ${MEMBERSHIP_WALLET_NUMBER_MESSAGES.NON_NEGATIVE}`),
  );

  assert.throws(
    () => validateWithdrawalRequest({
      amount: 200_000,
      available_balance: 100_000,
      pending_today_count: 0.5,
      has_bank_info: true,
    }),
    new RegExp(`withdrawal pending_today_count ${MEMBERSHIP_WALLET_NUMBER_MESSAGES.INTEGER}`),
  );

  assert.throws(
    () => validateWithdrawalRequest({
      amount: 200_000,
      available_balance: 100_000,
      pending_today_count: 0,
      has_bank_info: true,
      rules: {
        ...DEFAULT_WITHDRAWAL_RULES,
        fee_percentage: 1.5,
      },
    }),
    new RegExp(`withdrawal fee_percentage ${MEMBERSHIP_WALLET_NUMBER_MESSAGES.BETWEEN_0_AND_1}`),
  );
});

test('voucher rule failure reason matrix covers v2 and VITA reason contracts', () => {
  for (const reason of V2_VOUCHER_FAILURE_REASON_VALUES) {
    assert.equal(normalizeVoucherRuleFailureReason(reason), reason);
  }

  assert.deepEqual(VITA_VOUCHER_FAILURE_REASON_VALUES.map((reason) => normalizeVoucherRuleFailureReason(reason)), [
    VoucherRuleFailureReason.NOT_FOUND,
    VoucherRuleFailureReason.EXPIRED,
    VoucherRuleFailureReason.MAX_USES_REACHED,
    VoucherRuleFailureReason.SELF_USE_BLOCKED,
    VoucherRuleFailureReason.ALREADY_APPLIED,
    VoucherRuleFailureReason.MIN_ORDER_NOT_MET,
    VoucherRuleFailureReason.INACTIVE,
  ]);
  assert.deepEqual(Object.values(VITA_VOUCHER_FAILURE_REASONS), VITA_VOUCHER_FAILURE_REASON_VALUES);
  assert.equal(toVitaVoucherRuleFailureReason(VoucherRuleFailureReason.NOT_STARTED), 'inactive');
  assert.equal(toVitaVoucherRuleFailureReason(VoucherRuleFailureReason.TOTAL_LIMIT_REACHED), 'max_uses_reached');
  assert.equal(toVitaVoucherRuleFailureReason(VoucherRuleFailureReason.MIN_ORDER_VALUE_NOT_MET), 'min_order_not_met');
  assert.equal(toVitaVoucherRuleFailureReason(VoucherRuleFailureReason.NOT_IN_WHITELIST), null);
});

test('voucher create error matrix covers VITA create contract values', () => {
  assert.deepEqual(Object.values(VITA_VOUCHER_CREATE_ERRORS), VITA_VOUCHER_CREATE_ERROR_VALUES);
  assert.deepEqual(VITA_VOUCHER_CREATE_ERROR_VALUES, [
    'level_too_low',
    'discount_too_high',
    'duplicate_code',
    'invalid_code',
    'invalid_discount',
  ]);
});

test('voucher rule helpers evaluate timing, usage, and checkout constraints independently', () => {
  assert.equal(
    evaluateVoucherTimingRule({
      now: '2026-05-12T00:00:00.000Z',
      status: VOUCHER_TIMING_STATUS_DEFAULTS.ACTIVE,
      startAt: '2026-05-13T00:00:00.000Z',
    }),
    VoucherRuleFailureReason.NOT_STARTED,
  );
  assert.equal(
    evaluateVoucherUsageRule({ totalLimit: 10, usedCount: 10 }),
    VoucherRuleFailureReason.TOTAL_LIMIT_REACHED,
  );
  assert.equal(
    evaluateVoucherCheckoutRule({
      currentCode: 'SPRING10',
      alreadyAppliedCode: 'OTHER10',
      buyerId: 'buyer-a',
      authorId: 'author-a',
      selfUseBlocked: true,
      subtotal: 50_000,
      minOrderAmount: 100_000,
    }),
    VoucherRuleFailureReason.ALREADY_APPLIED,
  );
  assert.equal(
    evaluateVoucherCheckoutRule({
      buyerId: 'author-a',
      authorId: 'author-a',
      selfUseBlocked: true,
      subtotal: 150_000,
      minOrderAmount: 100_000,
    }),
    VoucherRuleFailureReason.SELF_USE_BLOCKED,
  );
});

test('voucher rule helpers reject malformed rule inputs instead of falling back to zero', () => {
  assert.throws(
    () => evaluateVoucherTimingRule({ now: 'not-a-date' }),
    /now must be a valid time/,
  );
  assert.throws(
    () => evaluateVoucherUsageRule({ totalLimit: 10 }),
    new RegExp(`usedCount ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER}`),
  );
  assert.throws(
    () => evaluateVoucherUsageRule({ perUserLimit: 1, userUsedCount: -1 }),
    new RegExp(`userUsedCount ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER}`),
  );
  assert.throws(
    () => evaluateVoucherCheckoutRule({ minOrderAmount: 100_000 }),
    new RegExp(`subtotal ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.FINITE_NON_NEGATIVE_NUMBER}`),
  );
});

test('voucher redemption lifecycle matrix covers v2, VITA, and legacy OLD_CODE usage semantics', () => {
  assert.deepEqual(V2_VOUCHER_REDEMPTION_STATUS_VALUES.map((status) => normalizeVoucherRedemptionState(status)), [
    VoucherRedemptionLifecycleState.RESERVED,
    VoucherRedemptionLifecycleState.REDEEMED,
    VoucherRedemptionLifecycleState.RELEASED,
  ]);
  assert.deepEqual(VITA_VOUCHER_USAGE_STATUS_VALUES.map((status) => normalizeVoucherRedemptionState(status)), [
    VoucherRedemptionLifecycleState.RESERVED,
    VoucherRedemptionLifecycleState.REDEEMED,
    VoucherRedemptionLifecycleState.RELEASED,
  ]);

  assert.equal(isVoucherUsageActive(undefined), true);
  assert.equal(isVoucherUsageActive('CONSUMED'), true);
  assert.equal(isVoucherUsageActive(VITA_VOUCHER_USAGE_STATUSES.COMPLETED), true);
  assert.equal(isVoucherUsageActive('RELEASED'), false);
  assert.equal(isVoucherUsageActive(VITA_VOUCHER_USAGE_STATUSES.CANCELLED), false);
});

test('voucher redemption helpers keep idempotency keys and usage deltas deterministic', () => {
  assert.equal(
    createVoucherRedemptionKey({
      tenantId: 'tenant-a',
      voucherId: 'voucher-a',
      orderId: 'order-a',
      partyId: 'party-a',
    }),
    'voucher-redemption:tenant-a:voucher-a:order-a:party-a',
  );
  assert.equal(
    createVoucherRedemptionKey({
      voucherId: 'voucher-a',
      orderId: 'order-a',
    }),
    'voucher-redemption:voucher-a:order-a',
  );
  assert.throws(
    () => createVoucherRedemptionKey({
      voucherId: ' ',
      orderId: 'order-a',
    }),
    /voucherId is required/,
  );
  assert.equal(applyVoucherUsageDelta(2, 1), 3);
  assert.equal(applyVoucherUsageDelta(2, -1), 1);
  assert.equal(applyVoucherUsageDelta(0, -1), 0);
  assert.throws(
    () => applyVoucherUsageDelta(Number.NaN, -1),
    new RegExp(`currentUses ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER}`),
  );
  assert.deepEqual(createVoucherUsageRedeemPlan({
    tenantId: 'tenant-a',
    voucherId: 'voucher-a',
    orderId: 'order-a',
    partyId: 'party-a',
    currentUses: 2,
    usageLimit: -1,
  }), {
    correlationId: 'voucher-redemption:tenant-a:voucher-a:order-a:party-a',
    nextUses: 3,
    nextVoucherStatus: null,
    nextUsageStatus: VOUCHER_USAGE_REDEEM_DEFAULTS.REDEEMED_USAGE_STATUS,
    expectedCurrentUses: 2,
    usageLimit: null,
    limitReached: false,
  });
  assert.deepEqual(createVoucherUsageRedeemPlan({
    voucherId: 'voucher-b',
    orderId: 'order-b',
    partyId: 'party-b',
    currentUses: 0,
    usageLimit: 1,
    currentVoucherStatus: 'active',
    exhaustedVoucherStatus: 'used',
    redeemedUsageStatus: 'CONSUMED',
  }), {
    correlationId: 'voucher-redemption:voucher-b:order-b:party-b',
    nextUses: 1,
    nextVoucherStatus: 'used',
    nextUsageStatus: 'CONSUMED',
    expectedCurrentUses: 0,
    usageLimit: 1,
    limitReached: true,
  });
  assert.throws(
    () => createVoucherUsageRedeemPlan({
      voucherId: 'voucher-a',
      orderId: 'order-a',
      currentUses: 0,
      usageLimit: Number.NaN,
    }),
    new RegExp(`usageLimit ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER}`),
  );
  assert.throws(
    () => createVoucherUsageReleasePlan({ currentVoucherStatus: VOUCHER_USAGE_RELEASE_DEFAULTS.EXHAUSTED_VOUCHER_STATUS }),
    new RegExp(`currentUses ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER}`),
  );
  assert.deepEqual(createVoucherUsageReleasePlan({
    currentUses: 1,
    currentVoucherStatus: VOUCHER_USAGE_RELEASE_DEFAULTS.EXHAUSTED_VOUCHER_STATUS,
  }), {
    nextUses: 0,
    nextVoucherStatus: VOUCHER_USAGE_RELEASE_DEFAULTS.ACTIVE_VOUCHER_STATUS,
    nextUsageStatus: VOUCHER_USAGE_RELEASE_DEFAULTS.RELEASED_USAGE_STATUS,
  });
  assert.deepEqual(createVoucherUsageReleasePlan({
    currentUses: 3,
    currentVoucherStatus: 'active',
    exhaustedVoucherStatus: 'EXHAUSTED',
    activeVoucherStatus: 'ACTIVE',
    releasedUsageStatus: 'RELEASED',
  }), {
    nextUses: 2,
    nextVoucherStatus: 'active',
    nextUsageStatus: 'RELEASED',
  });
});

test('OLD_CODE-derived recipes carry source trace metadata and keep title programs separate', () => {
  const modernRuntimeRecipes = DOMAIN_RECIPE_OLD_CODE_SOURCE_TRACE.filter((item) => item.scope === 'modern-runtime');
  assert.deepEqual(modernRuntimeRecipes.map((item) => item.recipe), [
    'membership.rank.conditions',
    'membership.benefits',
    'membership.score.ledger',
    'membership.wallet.withdrawal',
    'voucher.validation.redemption',
    'affiliate.direct.indirect',
  ]);

  for (const item of DOMAIN_RECIPE_OLD_CODE_SOURCE_TRACE) {
    assert.ok(item.sourcePaths.length > 0, `${item.recipe} must include OLD_CODE source paths`);
    assert.ok(item.sourcePaths.every((sourcePath) => sourcePath.startsWith('OLD_CODE/')));
    assert.ok(item.adoptedFacts.length > 0, `${item.recipe} must state adopted facts`);
    assert.ok(item.excludedFacts.length > 0, `${item.recipe} must state excluded facts`);
  }

  const titlePrograms = getOldCodeSourceTrace('title-programs.legacy');
  assert.equal(titlePrograms?.scope, 'future-title-program');
  assert.ok(titlePrograms?.excludedFacts.some((fact) => fact.includes('not member rank conditions')));
});
