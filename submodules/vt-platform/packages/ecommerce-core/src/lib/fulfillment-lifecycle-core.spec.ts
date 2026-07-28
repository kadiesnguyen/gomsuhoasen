import {
  buildStoreFulfillmentProgressPlan,
  FulfillmentLifecycleError,
  resolveNextStoreProgressOrderStatus,
  resolveStoreProgressFulfillmentStatus,
} from './fulfillment-lifecycle-core';

describe('buildStoreFulfillmentProgressPlan', () => {
  it('returns ALREADY_IN_STATE if states match', () => {
    const result = buildStoreFulfillmentProgressPlan({
      currentOrderStatus: 'PROCESSING',
      nextOrderStatus: 'PROCESSING',
      currentPaymentStatus: 'paid',
    });
    expect(result.noOpReason).toBe('ALREADY_IN_STATE');
    expect(result.intents).toEqual([]);
  });

  it('derives service-aware fulfillment status for store progression', () => {
    expect(resolveStoreProgressFulfillmentStatus('processing', true)).toBe('service_scheduled');
    expect(resolveStoreProgressFulfillmentStatus('processing', false)).toBe('packing');
    expect(resolveStoreProgressFulfillmentStatus('completed', true)).toBe('service_completed');
    expect(resolveStoreProgressFulfillmentStatus('completed', false)).toBe('delivered');
  });

  it('derives sequential next store progression status', () => {
    expect(resolveNextStoreProgressOrderStatus('pending_payment')).toBe('paid');
    expect(resolveNextStoreProgressOrderStatus('paid')).toBe('processing');
    expect(resolveNextStoreProgressOrderStatus('processing')).toBe('completed');
    expect(resolveNextStoreProgressOrderStatus('completed')).toBeNull();
  });

  it('returns computed fulfillment status for processing and completed targets', () => {
    const processingPlan = buildStoreFulfillmentProgressPlan({
      currentOrderStatus: 'paid',
      nextOrderStatus: 'processing',
      currentPaymentStatus: 'paid',
      orderType: 'physical',
    });
    expect(processingPlan.nextFulfillmentStatus).toBe('packing');

    const completedPlan = buildStoreFulfillmentProgressPlan({
      currentOrderStatus: 'processing',
      nextOrderStatus: 'completed',
      currentPaymentStatus: 'paid',
      orderType: 'membership_package',
    });
    expect(completedPlan.nextFulfillmentStatus).toBe('service_completed');
  });

  it('throws an explicit error when completing an unpaid order', () => {
    try {
      buildStoreFulfillmentProgressPlan({
        currentOrderStatus: 'processing',
        nextOrderStatus: 'completed',
        currentPaymentStatus: 'pending',
      });
      throw new Error('expected fulfillment planner to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FulfillmentLifecycleError);
      expect((error as FulfillmentLifecycleError).errorCode).toBe('ORDER_COMPLETE_UNPAID');
    }
  });

  it('throws an explicit error when shipping without tracking info', () => {
    try {
      buildStoreFulfillmentProgressPlan({
        currentOrderStatus: 'processing',
        nextOrderStatus: 'shipped',
        currentPaymentStatus: 'paid',
      });
      throw new Error('expected fulfillment planner to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FulfillmentLifecycleError);
      expect((error as FulfillmentLifecycleError).errorCode).toBe('ORDER_SHIPPED_TRACKING_REQUIRED');
    }
  });
});
