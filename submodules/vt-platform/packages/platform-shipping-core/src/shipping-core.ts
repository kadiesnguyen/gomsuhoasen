export const CARRIER_IDS = [
  'GHN',
  'GHTK',
  'AHAMOVE',
  'LALAMOVE',
  'VIETTEL_POST',
  'JT_EXPRESS',
] as const;

export type CarrierId = typeof CARRIER_IDS[number];

export const CARRIER_CAPABILITIES = [
  'CREATE_SHIPMENT',
  'CANCEL_SHIPMENT',
  'CALCULATE_FEE',
  'GET_LABEL',
  'TRACKING',
  'WEBHOOK',
  'COD',
] as const;

export type CarrierCapability = typeof CARRIER_CAPABILITIES[number];

export const SHIPMENT_SERVICE_TYPES = [
  'STANDARD',
  'EXPRESS',
  'ECONOMY',
  'SAME_DAY',
  'CUSTOM_RATE',
] as const;

export type ShipmentServiceType = typeof SHIPMENT_SERVICE_TYPES[number];

export const DEFAULT_SHIPMENT_SERVICE_TYPE: ShipmentServiceType = 'STANDARD';

export const DEFAULT_SHIPMENT_DIMENSIONS: Readonly<{ length: number; width: number; height: number }> = {
  length: 20,
  width: 20,
  height: 10,
};

export const DEFAULT_CARRIER_API_ERROR_MESSAGE = 'Unknown error';
export const DEFAULT_CARRIER_CAUGHT_ERROR_MESSAGE = 'unknown error';
export const DEFAULT_SHIPMENT_NOTE = 'Giao hang nhanh';
export const DEFAULT_SHIPMENT_ITEM_NAME = 'Default Item';
export const DEFAULT_CARRIER_REGISTRY_DUPLICATE_POLICY = 'replace';
export const SHIPPING_CORE_ERROR_MESSAGES = {
  CARRIER_ADAPTER_NOT_FOUND: (carrierId: CarrierId, availableCarrierIds: readonly CarrierId[]) => (
    `Carrier adapter not found: ${carrierId}. Available: [${availableCarrierIds.join(', ')}]`
  ),
  MISSING_OR_INVALID_CARRIER_FIELD: (fieldName: string) => `Missing or invalid carrier field: ${fieldName}`,
  CARRIER_ADAPTER_ALREADY_REGISTERED: (carrierId: CarrierId) => `Carrier adapter already registered: ${carrierId}`,
} as const;

export const SHIPPING_WEIGHT_UNITS = {
  GRAMS_PER_KILOGRAM: 1000,
} as const;

export const SHIPPING_LABEL_FORMATS = ['PDF', 'HTML', 'URL'] as const;

export type ShippingLabelFormat = typeof SHIPPING_LABEL_FORMATS[number];

export const TRANSPORT_NOTIFICATION_CONFIG_STATUSES = {
  ACCEPT: 'ACCEPT',
  UN_ACCEPT: 'UN_ACCEPT',
} as const;

export type TransportNotificationConfigStatus =
  (typeof TRANSPORT_NOTIFICATION_CONFIG_STATUSES)[keyof typeof TRANSPORT_NOTIFICATION_CONFIG_STATUSES];
export const TRANSPORT_NOTIFICATION_CONFIG_STATUS_VALUES = Object.values(TRANSPORT_NOTIFICATION_CONFIG_STATUSES);

export const TRANSPORT_TICKET_STATUSES = {
  WAIT: 'WAIT',
  ACCEPT: 'ACCEPT',
  UN_ACCEPT: 'UN_ACCEPT',
  COMPLETED: 'COMPLETED',
  CANCEL: 'CANCEL',
} as const;

export type TransportTicketStatus = (typeof TRANSPORT_TICKET_STATUSES)[keyof typeof TRANSPORT_TICKET_STATUSES];
export const TRANSPORT_TICKET_STATUS_VALUES = Object.values(TRANSPORT_TICKET_STATUSES);

export const TRANSPORT_TICKET_PAYMENT_STATUSES = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
} as const;

export type TransportTicketPaymentStatus =
  (typeof TRANSPORT_TICKET_PAYMENT_STATUSES)[keyof typeof TRANSPORT_TICKET_PAYMENT_STATUSES];
export const TRANSPORT_TICKET_PAYMENT_STATUS_VALUES = Object.values(TRANSPORT_TICKET_PAYMENT_STATUSES);

export const TRANSPORT_TICKET_PAYMENT_METHODS = {
  Cash_On_Delivery: 'Cash_On_Delivery',
  Zalo_Pay: 'Zalo_Pay',
  Bank_Transfer: 'Bank_Transfer',
  MOMO: 'MOMO',
  CHECKOUT_SDK: 'CHECKOUT_SDK',
  VNPAY: 'VNPAY',
  ATM: 'ATM',
  CC: 'CC',
  OTHER: 'OTHER',
} as const;

export type TransportTicketPaymentMethod =
  (typeof TRANSPORT_TICKET_PAYMENT_METHODS)[keyof typeof TRANSPORT_TICKET_PAYMENT_METHODS];
export const TRANSPORT_TICKET_PAYMENT_METHOD_VALUES = Object.values(TRANSPORT_TICKET_PAYMENT_METHODS);

export interface ShippingAddressData {
  recipientName: string;
  phone: string;
  address: string;
  ward?: string;
  district?: string;
  city: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
}

export interface ResolvedShippingAddress extends ShippingAddressData {
  carrierProvinceId?: string;
  carrierDistrictId?: string;
  carrierWardId?: string;
  cityCode?: string;
}

export interface CarrierCredentials {
  apiToken: string;
  apiSecret?: string;
  shopId?: string;
  clientSource?: string;
  market?: string;
  testMode: boolean;
}

export interface CreateShipmentParams {
  tenantId: string;
  orderId: string;
  idempotencyKey: string;
  pickupAddress: ResolvedShippingAddress;
  deliveryAddress: ResolvedShippingAddress;
  weight: number;
  dimensions?: { length: number; width: number; height: number };
  isCOD: boolean;
  codAmount?: number;
  insuranceValue?: number;
  serviceType: ShipmentServiceType;
  note?: string;
  credentials: CarrierCredentials;
}

export interface CarrierShipmentResult {
  trackingCode: string;
  externalOrderCode?: string;
  estimatedDelivery?: Date;
  shippingFee: number;
  labelUrl?: string;
}

export interface FeeCalcParams {
  pickupAddress: ResolvedShippingAddress;
  deliveryAddress: ResolvedShippingAddress;
  weight: number;
  dimensions?: { length: number; width: number; height: number };
  isCOD: boolean;
  codAmount?: number;
  insuranceValue?: number;
  serviceType?: ShipmentServiceType;
  credentials: CarrierCredentials;
}

export interface CarrierFeeResult {
  carrierId: CarrierId;
  serviceType: string;
  fee: number;
  currency: string;
  estimatedDays: number;
}

export interface CarrierStatusResult {
  trackingCode: string;
  status: string;
  carrierRawStatus: string;
  timestamp: Date;
  location?: string;
}

export interface LabelResult {
  format: ShippingLabelFormat;
  data: Buffer | string;
}

export type WebhookPayload = {
  [key: string]: string | number | boolean | null | WebhookPayload | WebhookPayload[];
};

export interface NormalizedTrackingEvent {
  trackingCode: string;
  status: string;
  carrierRawStatus: string;
  timestamp: Date;
  location?: string;
  rawPayload: WebhookPayload;
}

export interface ICarrierAdapter {
  readonly carrierId: CarrierId;
  readonly capabilities: CarrierCapability[];

  createShipment(params: CreateShipmentParams): Promise<CarrierShipmentResult>;
  cancelShipment(trackingCode: string, credentials: CarrierCredentials): Promise<void>;
  getStatus(trackingCode: string, credentials: CarrierCredentials): Promise<CarrierStatusResult>;
  calculateFee(params: FeeCalcParams): Promise<CarrierFeeResult[]>;
  getLabel(trackingCode: string, credentials: CarrierCredentials): Promise<LabelResult>;
  verifyWebhookSignature(headers: Record<string, string>, body: WebhookPayload, secret?: string): boolean;
  parseWebhookPayload(body: WebhookPayload): NormalizedTrackingEvent;
}

export const CARRIER_ADAPTERS = Symbol('CARRIER_ADAPTERS');

export class CarrierAdapterNotFoundError extends Error {
  constructor(
    readonly carrierId: CarrierId,
    readonly availableCarrierIds: CarrierId[],
  ) {
    super(SHIPPING_CORE_ERROR_MESSAGES.CARRIER_ADAPTER_NOT_FOUND(carrierId, availableCarrierIds));
    this.name = 'CarrierAdapterNotFoundError';
  }
}

export class CarrierAdapterInputError extends Error {
  constructor(
    readonly fieldName: string,
    message = SHIPPING_CORE_ERROR_MESSAGES.MISSING_OR_INVALID_CARRIER_FIELD(fieldName),
  ) {
    super(message);
    this.name = 'CarrierAdapterInputError';
  }
}

export type CarrierErrorFactory = (message: string) => Error;

function createCarrierInputError(
  fieldName: string,
  createError?: CarrierErrorFactory,
): Error {
  const message = SHIPPING_CORE_ERROR_MESSAGES.MISSING_OR_INVALID_CARRIER_FIELD(fieldName);
  return createError?.(message) ?? new CarrierAdapterInputError(fieldName, message);
}

export function requireCarrierText(
  value: unknown,
  fieldName: string,
  createError?: CarrierErrorFactory,
): string {
  if (typeof value !== 'string') {
    throw createCarrierInputError(fieldName, createError);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw createCarrierInputError(fieldName, createError);
  }
  return trimmed;
}

export function optionalCarrierText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function carrierApiMessage(value: unknown): string {
  return optionalCarrierText(value) ?? DEFAULT_CARRIER_API_ERROR_MESSAGE;
}

export function carrierCaughtErrorMessage(error: unknown): string {
  return error instanceof Error && optionalCarrierText(error.message)
    ? error.message.trim()
    : DEFAULT_CARRIER_CAUGHT_ERROR_MESSAGE;
}

export function resolveShipmentServiceType(value: ShipmentServiceType | null | undefined): ShipmentServiceType {
  return value ?? DEFAULT_SHIPMENT_SERVICE_TYPE;
}

export function resolveShipmentDimensions(
  value: { length: number; width: number; height: number } | null | undefined,
): { length: number; width: number; height: number } {
  return value ?? { ...DEFAULT_SHIPMENT_DIMENSIONS };
}

export function gramsToKilograms(weightInGrams: number): number {
  return weightInGrams / SHIPPING_WEIGHT_UNITS.GRAMS_PER_KILOGRAM;
}

export function requireCarrierInteger(
  value: unknown,
  fieldName: string,
  createError?: CarrierErrorFactory,
): number {
  const text = requireCarrierText(value, fieldName, createError);
  if (!/^\d+$/.test(text)) {
    throw createCarrierInputError(fieldName, createError);
  }
  const parsed = Number.parseInt(text, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw createCarrierInputError(fieldName, createError);
  }
  return parsed;
}

export function requireCarrierNonNegativeNumber(
  value: unknown,
  fieldName: string,
  createError?: CarrierErrorFactory,
): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value.trim())
      : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createCarrierInputError(fieldName, createError);
  }
  return parsed;
}

export function optionalCarrierNonNegativeNumber(
  value: unknown,
  fieldName: string,
  createError?: CarrierErrorFactory,
  defaultValue = 0,
): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return requireCarrierNonNegativeNumber(value, fieldName, createError);
}

export interface CarrierRegistryOptions {
  onDuplicate?: 'replace' | 'throw';
}

export class CarrierRegistryCore {
  private readonly adapters = new Map<CarrierId, ICarrierAdapter>();
  private readonly onDuplicate: 'replace' | 'throw';

  constructor(adapters: readonly ICarrierAdapter[] = [], options: CarrierRegistryOptions = {}) {
    this.onDuplicate = options.onDuplicate ?? DEFAULT_CARRIER_REGISTRY_DUPLICATE_POLICY;
    for (const adapter of adapters) {
      this.register(adapter);
    }
  }

  register(adapter: ICarrierAdapter): void {
    if (this.adapters.has(adapter.carrierId) && this.onDuplicate === 'throw') {
      throw new Error(SHIPPING_CORE_ERROR_MESSAGES.CARRIER_ADAPTER_ALREADY_REGISTERED(adapter.carrierId));
    }
    this.adapters.set(adapter.carrierId, adapter);
  }

  get(carrierId: CarrierId): ICarrierAdapter {
    const adapter = this.adapters.get(carrierId);
    if (!adapter) {
      throw new CarrierAdapterNotFoundError(carrierId, this.getRegisteredCarriers());
    }
    return adapter;
  }

  has(carrierId: CarrierId): boolean {
    return this.adapters.has(carrierId);
  }

  getAll(): ICarrierAdapter[] {
    return Array.from(this.adapters.values());
  }

  getByCapability(capability: CarrierCapability): ICarrierAdapter[] {
    return this.getAll().filter((adapter) => adapter.capabilities.includes(capability));
  }

  getRegisteredCarriers(): CarrierId[] {
    return Array.from(this.adapters.keys());
  }
}
