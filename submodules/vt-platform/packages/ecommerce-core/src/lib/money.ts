/**
 * Shared money/price calculation helpers.
 *
 * Common patterns extracted from v2 and vita order checkout flows.
 * Both projects compute subtotal → discount → shipping → final amount.
 *
 * @source v2: libs/modules/ecommerce/src/lib/services/order.service.ts — checkout total calculation
 * @source vita: libs/modules/ecommerce/src/order.service.ts — createOrder total computation
 * @source ghs: libs/modules/quote/src/lib/services/quote.service.ts — subtotal/discount/total
 */

/**
 * Round a monetary value to the specified decimal places.
 *
 * Default 0 decimals (VND is integer-based).
 * Use 2 for USD/EUR contexts.
 */
export function roundMoney(amount: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/**
 * Apply a discount to a subtotal. Returns the discounted amount (≥ 0).
 *
 * @param subtotal - Original subtotal
 * @param discount - Discount amount (not percentage)
 * @returns Subtotal after discount (never negative)
 */
export function calculateDiscount(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount);
}

/**
 * Calculate final order amount from subtotal, discount, and shipping.
 *
 * Pattern shared by:
 * - vita: order.service.ts → subtotal - discount - points_applied + shipping
 * - GHS: quote.service.ts → subtotal - discount
 * - v2: order checkout → subtotal - discount + shipping + tax
 *
 * @param subtotal - Item subtotal
 * @param discount - Total discount applied
 * @param shipping - Shipping cost (default 0)
 * @param pointsApplied - Points/credits applied as money (default 0)
 * @returns Final amount (never negative)
 */
export function calculateFinalAmount(
  subtotal: number,
  discount: number,
  shipping = 0,
  pointsApplied = 0,
): number {
  return Math.max(0, roundMoney(subtotal - discount - pointsApplied + shipping));
}
