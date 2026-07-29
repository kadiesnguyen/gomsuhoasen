import { DomainBadRequestException } from '@vt/platform-error';
import { readArrayInput } from '@vt/common-utils';
import { ORDER_ERRORS } from './order.constants';
import { OrderStatus } from '../schemas/order.schema';
import type { CreateOrderDto, OrderLineItemDto } from '../dto/order.dto';

export function buildInitialOrderValues(input: CreateOrderDto) {
  const lineItems = readArrayInput<OrderLineItemDto>(input.lineItems).map((item) => {
    const quantity = Math.max(1, Math.floor(item.quantity));
    const unitPrice = Math.max(0, item.unitPrice);
    return {
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
    };
  });

  if (lineItems.length === 0) {
    throw new DomainBadRequestException(
      ORDER_ERRORS.ORDER_EMPTY_LINE_ITEMS,
      'Đơn hàng cần ít nhất một sản phẩm',
    );
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    shippingAddress: {
      street: input.shippingAddress.street.trim(),
      provinceCode: input.shippingAddress.provinceCode,
      provinceName: input.shippingAddress.provinceName,
      wardCode: input.shippingAddress.wardCode,
      wardName: input.shippingAddress.wardName,
    },
    lineItems,
    subtotal,
    total: subtotal,
    status: OrderStatus.NEW,
  };
}
