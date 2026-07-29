import { DomainBadRequestException } from '@vt/platform-error';
import { assertTransition, type TransitionTable } from '@vt/platform-state-machine';
import { ORDER_ERRORS } from './order.constants';
import { OrderStatus } from '../schemas/order.schema';

export const ORDER_TRANSITIONS: TransitionTable<OrderStatus> = {
  [OrderStatus.NEW]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return;
  assertTransition(
    {
      transitions: ORDER_TRANSITIONS,
      createError: ({ from: current, to: target, allowed }) =>
        new DomainBadRequestException(
          ORDER_ERRORS.ORDER_INVALID_STATUS_TRANSITION,
          `Không thể chuyển trạng thái từ ${current} sang ${target}`,
          { current, target, allowed },
        ),
    },
    from,
    to,
  );
}
