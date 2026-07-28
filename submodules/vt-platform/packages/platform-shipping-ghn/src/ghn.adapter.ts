import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  type CarrierCapability,
  type CarrierCredentials,
  type CarrierFeeResult,
  type CarrierId,
  type CarrierShipmentResult,
  type CarrierStatusResult,
  type CreateShipmentParams,
  type FeeCalcParams,
  type ICarrierAdapter,
  type LabelResult,
  type NormalizedTrackingEvent,
  type WebhookPayload,
  DEFAULT_SHIPMENT_NOTE,
  carrierApiMessage,
  carrierCaughtErrorMessage,
  optionalCarrierNonNegativeNumber,
  optionalCarrierText,
  requireCarrierInteger,
  requireCarrierNonNegativeNumber,
  requireCarrierText,
  resolveShipmentDimensions,
  resolveShipmentServiceType,
} from '@vt/platform-shipping-core';

interface GhnApiResponse<T> {
  code: number;
  message?: string;
  data: T;
}

interface GhnCreateOrderData {
  order_code: string;
  client_order_code: string;
  total_fee: number;
  expected_delivery_time?: string;
}

interface GhnOrderStatusData {
  order_code: string;
  status: string;
  warehouse?: string;
}

interface GhnFeeData {
  total: number;
}

interface GhnLabelTokenData {
  token: string;
}

export interface GhnAdapterOptions {
  createError?: (message: string) => Error;
  logger?: {
    log?(message: string): void;
    warn?(message: string, trace?: string): void;
    error?(message: string, trace?: string): void;
  };
}

export const GHN_API_BASE_URLS = {
  SANDBOX: 'https://dev-online-gateway.ghn.vn',
  PRODUCTION: 'https://online-gateway.ghn.vn',
} as const;

export function getGhnApiBaseUrl(testMode: boolean): string {
  return testMode ? GHN_API_BASE_URLS.SANDBOX : GHN_API_BASE_URLS.PRODUCTION;
}

export class GhnCarrierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GhnCarrierError';
  }
}

export const GHN_SHIPMENT_STATUS = {
  READY_TO_SHIP: 'READY_TO_SHIP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED_DELIVERY: 'FAILED_DELIVERY',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;

export const GHN_ERROR_MESSAGES = {
  API_ERROR: (message: string) => `GHN Error: ${message}`,
  CANCEL_ERROR: (message: unknown) => `GHN Cancel Error: ${message}`,
  TRACK_ERROR: (message: unknown) => `GHN Track Error: ${message}`,
  FEE_CALCULATION_FAILED: (serviceType: string, message: string) => (
    `GHN fee calculation failed for service ${serviceType}: ${message}`
  ),
  LABEL_GEN_ERROR: (message: unknown) => `GHN Label Gen Error: ${message}`,
} as const;

@Injectable()
export class GhnAdapter implements ICarrierAdapter {
  readonly carrierId: CarrierId = 'GHN';
  readonly capabilities: CarrierCapability[] = [
    'CREATE_SHIPMENT',
    'CANCEL_SHIPMENT',
    'CALCULATE_FEE',
    'GET_LABEL',
    'TRACKING',
    'COD',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly options: GhnAdapterOptions = {},
  ) {}

  async createShipment(params: CreateShipmentParams): Promise<CarrierShipmentResult> {
    this.options.logger?.log?.(`Creating GHN shipment for order ${params.orderId}`);
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const url = `${baseUrl}/shiip/public-api/v2/shipping-order/create`;
    const { length, width, height } = resolveShipmentDimensions(params.dimensions);
    const deliveryWardCode = requireCarrierText(
      params.deliveryAddress.wardCode,
      'GHN delivery ward code',
      this.options.createError,
    );
    const deliveryDistrictId = requireCarrierInteger(
      params.deliveryAddress.districtCode,
      'GHN delivery district code',
      this.options.createError,
    );

    const payload = {
      payment_type_id: params.isCOD ? 2 : 1,
      note: optionalCarrierText(params.note) ?? DEFAULT_SHIPMENT_NOTE,
      required_note: 'CHOXEMHANGKHONGTHU',
      client_order_code: params.idempotencyKey,
      to_name: params.deliveryAddress.recipientName,
      to_phone: params.deliveryAddress.phone,
      to_address: params.deliveryAddress.address,
      to_ward_code: deliveryWardCode,
      to_district_id: deliveryDistrictId,
      cod_amount: params.isCOD ? params.codAmount : 0,
      weight: params.weight,
      length,
      width,
      height,
      service_type_id: this.mapServiceType(params.serviceType),
      items: [
        {
          name: `San pham ${params.orderId}`,
          quantity: 1,
          weight: params.weight,
        },
      ],
    };

    try {
      const resp = await lastValueFrom(
        this.httpService.post<GhnApiResponse<GhnCreateOrderData>>(url, payload, { headers: this.getHeaders(params.credentials) }),
      );

      if (resp.data.code !== 200) {
        throw this.createError(GHN_ERROR_MESSAGES.API_ERROR(carrierApiMessage(resp.data.message)));
      }

      const data = resp.data.data;
      return {
        trackingCode: data.order_code,
        externalOrderCode: data.client_order_code,
        estimatedDelivery: data.expected_delivery_time ? new Date(data.expected_delivery_time) : undefined,
        shippingFee: requireCarrierNonNegativeNumber(data.total_fee, 'GHN create-order total fee', this.options.createError),
      };
    } catch (error) {
      this.options.logger?.error?.(
        `Failed to create GHN shipment: ${(error as Error).message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async cancelShipment(trackingCode: string, credentials: CarrierCredentials): Promise<void> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/shiip/public-api/v2/switch-status/cancel`;
    const payload = { order_codes: [trackingCode] };

    const resp = await lastValueFrom(
      this.httpService.post<GhnApiResponse<null>>(url, payload, { headers: this.getHeaders(credentials) }),
    );

    if (resp.data.code !== 200) {
      throw this.createError(GHN_ERROR_MESSAGES.CANCEL_ERROR(resp.data.message));
    }
  }

  async getStatus(trackingCode: string, credentials: CarrierCredentials): Promise<CarrierStatusResult> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/shiip/public-api/v2/shipping-order/detail`;
    const payload = { order_code: trackingCode };

    const resp = await lastValueFrom(
      this.httpService.post<GhnApiResponse<GhnOrderStatusData>>(url, payload, { headers: this.getHeaders(credentials) }),
    );

    if (resp.data.code !== 200) {
      throw this.createError(GHN_ERROR_MESSAGES.TRACK_ERROR(resp.data.message));
    }

    const data = resp.data.data;
    return {
      trackingCode: data.order_code,
      status: this.mapGhnStatus(data.status),
      carrierRawStatus: data.status,
      timestamp: new Date(),
      location: optionalCarrierText(data.warehouse),
    };
  }

  async calculateFee(params: FeeCalcParams): Promise<CarrierFeeResult[]> {
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const url = `${baseUrl}/shiip/public-api/v2/shipping-order/fee`;
    const { length, width, height } = resolveShipmentDimensions(params.dimensions);
    const serviceType = resolveShipmentServiceType(params.serviceType);
    const pickupDistrictId = requireCarrierInteger(
      params.pickupAddress.districtCode,
      'GHN pickup district code',
      this.options.createError,
    );
    const deliveryDistrictId = requireCarrierInteger(
      params.deliveryAddress.districtCode,
      'GHN delivery district code',
      this.options.createError,
    );
    const deliveryWardCode = requireCarrierText(
      params.deliveryAddress.wardCode,
      'GHN delivery ward code',
      this.options.createError,
    );

    const payload = {
      service_type_id: this.mapServiceType(serviceType),
      insurance_value: optionalCarrierNonNegativeNumber(params.insuranceValue, 'GHN insurance value', this.options.createError),
      coupon: null,
      from_district_id: pickupDistrictId,
      to_district_id: deliveryDistrictId,
      to_ward_code: deliveryWardCode,
      weight: params.weight,
      length,
      width,
      height,
    };

    try {
      const resp = await lastValueFrom(
        this.httpService.post<GhnApiResponse<GhnFeeData>>(url, payload, { headers: this.getHeaders(params.credentials) }),
      );

      if (resp.data.code !== 200) return [];

      return [{
        carrierId: 'GHN',
        serviceType,
        fee: requireCarrierNonNegativeNumber(resp.data.data.total, 'GHN fee total', this.options.createError),
        currency: 'VND',
        estimatedDays: 3,
      }];
    } catch (error) {
      this.options.logger?.warn?.(
        GHN_ERROR_MESSAGES.FEE_CALCULATION_FAILED(serviceType, carrierCaughtErrorMessage(error)),
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async getLabel(trackingCode: string, credentials: CarrierCredentials): Promise<LabelResult> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/shiip/public-api/v2/a5/gen-token`;
    const payload = { order_codes: [trackingCode] };

    const resp = await lastValueFrom(
      this.httpService.post<GhnApiResponse<GhnLabelTokenData>>(url, payload, { headers: this.getHeaders(credentials) }),
    );

    if (resp.data.code !== 200) {
      throw this.createError(GHN_ERROR_MESSAGES.LABEL_GEN_ERROR(resp.data.message));
    }

    const token = resp.data.data.token;
    return {
      format: 'URL',
      data: `${baseUrl}/a5/public-api/printA5?token=${token}`,
    };
  }

  verifyWebhookSignature(
    _headers: Record<string, string>,
    _body: WebhookPayload,
    _secret?: string,
  ): boolean {
    return false;
  }

  parseWebhookPayload(body: WebhookPayload): NormalizedTrackingEvent {
    return {
      trackingCode: body['OrderCode'] as string,
      status: this.mapGhnStatus(body['Status'] as string),
      carrierRawStatus: body['Status'] as string,
      timestamp: body['Time'] ? new Date(body['Time'] as string) : new Date(),
      location: typeof body['WarehouseName'] === 'string' && body['WarehouseName'].trim()
        ? body['WarehouseName'].trim()
        : undefined,
      rawPayload: body,
    };
  }

  protected getBaseUrl(testMode: boolean): string {
    return getGhnApiBaseUrl(testMode);
  }

  protected getHeaders(credentials: CarrierCredentials) {
    return {
      'Content-Type': 'application/json',
      Token: credentials.apiToken,
      ShopId: requireCarrierText(credentials.shopId, 'GHN shop id', this.options.createError),
    };
  }

  protected mapServiceType(type: string): number {
    switch (type) {
      case 'EXPRESS': return 1;
      case 'STANDARD': return 2;
      case 'ECONOMY': return 3;
      default: return 2;
    }
  }

  protected mapGhnStatus(ghnStatus: string): string {
    const status = ghnStatus.toLowerCase();
    if (status.includes('ready_to_pick')) return GHN_SHIPMENT_STATUS.READY_TO_SHIP;
    if (status.includes('picking')) return GHN_SHIPMENT_STATUS.PICKED_UP;
    if (status.includes('storing') || status.includes('transporting')) return GHN_SHIPMENT_STATUS.IN_TRANSIT;
    if (status.includes('delivering')) return GHN_SHIPMENT_STATUS.OUT_FOR_DELIVERY;
    if (status.includes('delivered')) return GHN_SHIPMENT_STATUS.DELIVERED;
    if (status.includes('delivery_fail')) return GHN_SHIPMENT_STATUS.FAILED_DELIVERY;
    if (status.includes('cancel')) return GHN_SHIPMENT_STATUS.CANCELLED;
    if (status.includes('return')) return GHN_SHIPMENT_STATUS.RETURNED;
    return GHN_SHIPMENT_STATUS.IN_TRANSIT;
  }

  private createError(message: string): Error {
    return this.options.createError?.(message) ?? new GhnCarrierError(message);
  }
}
