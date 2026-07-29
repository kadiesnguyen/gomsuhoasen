import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES } from '@gomhoasen/contracts';
import { assertOrderTransition } from './order-transitions';

describe('assertOrderTransition', () => {
  it('allows NEW → CONFIRMED', () => {
    expect(() =>
      assertOrderTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.CONFIRMED),
    ).not.toThrow();
  });

  it('blocks NEW → SHIPPING', () => {
    expect(() =>
      assertOrderTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.SHIPPING),
    ).toThrow();
  });

  it('blocks COMPLETED → anything', () => {
    expect(() =>
      assertOrderTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED),
    ).toThrow();
  });
});
