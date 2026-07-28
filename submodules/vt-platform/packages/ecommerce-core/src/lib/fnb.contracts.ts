export const FNB_RESTAURANT_RESERVATION_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  DONE: 'DONE',
} as const;

export type FnbRestaurantReservationStatus =
  (typeof FNB_RESTAURANT_RESERVATION_STATUSES)[keyof typeof FNB_RESTAURANT_RESERVATION_STATUSES];
export const FNB_RESTAURANT_RESERVATION_STATUS_VALUES = Object.values(FNB_RESTAURANT_RESERVATION_STATUSES);

export const FNB_RESTAURANT_RECORD_STATUSES = {
  DEFAULT: 'default',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type FnbRestaurantRecordStatus =
  (typeof FNB_RESTAURANT_RECORD_STATUSES)[keyof typeof FNB_RESTAURANT_RECORD_STATUSES];
export const FNB_RESTAURANT_RECORD_STATUS_VALUES = Object.values(FNB_RESTAURANT_RECORD_STATUSES);

export const FNB_ORDER_SESSION_STATUSES = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
} as const;

export type FnbOrderSessionStatus = (typeof FNB_ORDER_SESSION_STATUSES)[keyof typeof FNB_ORDER_SESSION_STATUSES];
export const FNB_ORDER_SESSION_STATUS_VALUES = Object.values(FNB_ORDER_SESSION_STATUSES);

export function isFnbRestaurantReservationStatus(input: unknown): input is FnbRestaurantReservationStatus {
  return typeof input === 'string'
    && FNB_RESTAURANT_RESERVATION_STATUS_VALUES.includes(input as FnbRestaurantReservationStatus);
}

export function isFnbRestaurantRecordStatus(input: unknown): input is FnbRestaurantRecordStatus {
  return typeof input === 'string'
    && FNB_RESTAURANT_RECORD_STATUS_VALUES.includes(input as FnbRestaurantRecordStatus);
}

export function isFnbOrderSessionStatus(input: unknown): input is FnbOrderSessionStatus {
  return typeof input === 'string'
    && FNB_ORDER_SESSION_STATUS_VALUES.includes(input as FnbOrderSessionStatus);
}
