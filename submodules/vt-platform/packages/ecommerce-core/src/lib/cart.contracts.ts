/**
 * Shared cart item contracts.
 *
 * Abstracts the common cart item shape used in both v2 (CartItem) and
 * vita (CartLineEntity). Each project extends with domain fields.
 *
 * @source v2: libs/modules/ecommerce/src/lib/schemas/cart.schema.ts — CartItem
 * @source vita: libs/modules/ecommerce/src/cart.schema.ts — CartLineEntity
 */
import { DomainBadRequestException, ECOMMERCE_ERROR_CODES } from '@vt/platform-error';

export const ECOMMERCE_CORE_ERROR_MESSAGES = {
  CART_ITEM_PRICE_INVALID: 'Cart item price must be a non-negative finite number.',
  CART_ITEM_QUANTITY_INVALID: 'Cart item quantity must be a positive integer.',
  INVALID_NUMBER: 'Provided numeric value is invalid or out of bounds.',
} as const;

/**
 * Minimal cart item interface — the intersection of v2 and vita cart items.
 *
 * v2 adds: name, sku, price, imageUrl, attributes (product snapshot)
 * vita adds: (extends only product_id + quantity, resolves rest at checkout)
 */
export interface ICartItem {
  /** Product identifier — v2 uses ObjectId ref, vita uses string member_id. */
  product_id: string;

  /** Quantity of this line item (≥ 1). */
  quantity: number;

  /** Unit price at time of adding to cart. Optional — some projects resolve at checkout. */
  price?: number;

  /** Product name snapshot. Optional — some projects resolve at checkout. */
  name?: string;
}

/**
 * Minimal cart interface.
 *
 * v2 scopes by tenantId + partyId, vita scopes by member_id.
 * This abstracts to a generic `owner_id`.
 */
export interface ICart<TItem extends ICartItem = ICartItem> {
  /** Owner of this cart — maps to partyId (v2) or member_id (vita). */
  owner_id: string;

  /** Line items in the cart. */
  items: TItem[];
}

/**
 * Snapshot of the cart at the time of checkout.
 * Used to lock in prices and compute totals before order creation.
 */
export interface ICartSnapshot<TItem extends ICartItem = ICartItem> extends ICart<TItem> {
  /** Computed total price of all items before any discounts/fees. */
  cartTotal: number;
}

/**
 * Represents the input required to calculate final order pricing.
 */
export interface ICheckoutDraft<TItem extends ICartItem = ICartItem> {
  cartSnapshot: ICartSnapshot<TItem>;
  discountVoucher?: number;
  discountPoint?: number;
  shippingFee?: number;
  // Optional flag to indicate if membership discount applies
  applyMembershipDiscount?: boolean;
}

/**
 * Standardized generic Order Input struct before persisting to DB.
 */
export interface IOrderInput<TItem extends ICartItem = ICartItem> {
  buyerId: string;
  cart: TItem[];
  totalPayment: number;
  discountVoucher: number;
  discountPoint: number;
  discountMembership: number;
  shippingFee: number;
  status: string;
  paymentMethod: string;
}

/**
 * Compute cart subtotal from items with price and quantity.
 *
 * Common pattern used in both v2 order checkout and vita order creation.
 *
 * @param items - Items with price and quantity
 * @returns Sum of price * quantity for all items
 */
export function computeCartSubtotal(
  items: ReadonlyArray<Pick<ICartItem, 'quantity' | 'price'>>,
): number {
  return items.reduce((sum, item) => {
    const price = item.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
}

/**
 * Count total items in a cart (sum of quantities, not distinct products).
 */
export function computeCartItemCount(
  items: ReadonlyArray<Pick<ICartItem, 'quantity'>>,
): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Compute cart subtotal with strict quantity and price checks.
 * Throws DomainBadRequestException if price is negative/non-finite/absent,
 * or if quantity is non-integer/non-positive/absent.
 */
export function computeStrictCartSubtotal(
  items: ReadonlyArray<Pick<ICartItem, 'quantity' | 'price'>>,
): number {
  if (!items || items.length === 0) {
    return 0;
  }
  return items.reduce((sum, item) => {
    if (
      item.price === undefined ||
      item.price === null ||
      typeof item.price !== 'number' ||
      !Number.isFinite(item.price) ||
      item.price < 0
    ) {
      throw new DomainBadRequestException(
        ECOMMERCE_ERROR_CODES.ORDER_INVALID_NON_NEGATIVE_NUMBER,
        ECOMMERCE_CORE_ERROR_MESSAGES.CART_ITEM_PRICE_INVALID,
      );
    }
    if (
      item.quantity === undefined ||
      item.quantity === null ||
      typeof item.quantity !== 'number' ||
      !Number.isFinite(item.quantity) ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new DomainBadRequestException(
        ECOMMERCE_ERROR_CODES.ORDER_INVALID_POSITIVE_INTEGER,
        ECOMMERCE_CORE_ERROR_MESSAGES.CART_ITEM_QUANTITY_INVALID,
      );
    }
    return sum + item.price * item.quantity;
  }, 0);
}
