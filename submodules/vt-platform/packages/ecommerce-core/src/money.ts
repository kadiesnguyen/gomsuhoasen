/**
 * @vt/ecommerce-core/money — Browser-safe money/price helpers.
 *
 * This barrel re-exports only the pure-arithmetic money utilities from
 * `@vt/ecommerce-core`. Unlike the package root, this entrypoint does NOT
 * import `@vt/platform-error` (which depends on `@nestjs/common`) and is
 * therefore safe for frontend/Vite bundles.
 *
 * Usage:
 *   import { calculateDiscount } from '@vt/ecommerce-core/money';
 */
export { roundMoney, calculateDiscount, calculateFinalAmount } from './lib/money';
