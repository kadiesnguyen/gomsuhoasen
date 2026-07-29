export const ORDER_STATUSES = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUSES) as OrderStatus[];

export interface OrderLineItemContract {
  productId: string;
  productName: string;
  productSlug?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderShippingAddressContract {
  street: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
}

export interface OrderContract {
  id: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: OrderShippingAddressContract;
  lineItems: OrderLineItemContract[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  internalNote?: string;
  createdAt: string;
}
