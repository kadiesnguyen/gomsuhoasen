/**
 * @vt/platform-shipping-viettel-post — ViettelPost carrier adapter.
 *
 * Implements ICarrierAdapter for ViettelPost V2 API.
 */
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
  carrierApiMessage,
  carrierCaughtErrorMessage,
  optionalCarrierNonNegativeNumber,
  optionalCarrierText,
  requireCarrierInteger,
  requireCarrierNonNegativeNumber,
  resolveShipmentServiceType,
} from '@vt/platform-shipping-core';

interface VtpApiResponse<T> {
  status: number;
  message?: string;
  data: T;
}

interface VtpCreateOrderData {
  ORDER_NUMBER: string;
  ORDER_REFERENCE?: string;
  MONEY_TOTAL?: number;
}

interface VtpCancelData {
  status?: number;
}

interface VtpOrderStatusData {
  ORDER_NUMBER: string;
  ORDER_STATUS: number;
  CURRENT_LOCATION?: string;
}

interface VtpFeeData {
  MONEY_TOTAL?: number;
}

export interface ViettelPostAdapterOptions {
  createError?: (message: string) => Error;
  logger?: {
    log?(message: string): void;
    warn?(message: string, trace?: string): void;
    error?(message: string, trace?: string): void;
  };
}

export const VIETTEL_POST_API_BASE_URLS = {
  SANDBOX: 'https://partnerdev.viettelpost.vn',
  PRODUCTION: 'https://partner.viettelpost.vn',
} as const;

export function getViettelPostApiBaseUrl(testMode: boolean): string {
  return testMode ? VIETTEL_POST_API_BASE_URLS.SANDBOX : VIETTEL_POST_API_BASE_URLS.PRODUCTION;
}

export class ViettelPostCarrierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ViettelPostCarrierError';
  }
}

export const VIETTEL_POST_STATUS_CODES = {
  IN_TRANSIT: 105,
  DELIVERED: [500, 505] as readonly number[],
  FAILED: [501, 504] as readonly number[],
  RETURNED: [502, 503] as readonly number[],
  CANCELLED: -100,
} as const;

export const VTP_SHIPMENT_STATUS = {
  READY_TO_SHIP: 'READY_TO_SHIP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED_DELIVERY: 'FAILED_DELIVERY',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;

export const VIETTEL_POST_ERROR_MESSAGES = {
  API_ERROR: (message: string) => `ViettelPost Error: ${message}`,
  CANCEL_ERROR: (message: unknown) => `ViettelPost Cancel Error: ${message}`,
  TRACK_ERROR: (message: unknown) => `ViettelPost Track Error: ${message}`,
  SHIPMENT_NOT_FOUND: 'Shipment not found',
  FEE_CALCULATION_FAILED: (message: string) => `ViettelPost fee calculation failed: ${message}`,
} as const;

@Injectable()
export class ViettelPostAdapter implements ICarrierAdapter {
  readonly carrierId: CarrierId = 'VIETTEL_POST';
  readonly capabilities: CarrierCapability[] = [
    'CREATE_SHIPMENT', 'CANCEL_SHIPMENT', 'CALCULATE_FEE',
    'TRACKING', 'COD',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly options: ViettelPostAdapterOptions = {},
  ) {}

  async createShipment(params: CreateShipmentParams): Promise<CarrierShipmentResult> {
    this.options.logger?.log?.(`Creating ViettelPost shipment for order ${params.orderId}`);
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const url = `${baseUrl}/v2/order/createOrder`;
    const groupAddressId = requireCarrierInteger(
      params.credentials.shopId,
      'ViettelPost group address id',
      this.options.createError,
    );

    const payload = {
      ORDER_NUMBER: params.idempotencyKey,
      GROUPADDRESS_ID: groupAddressId,
      CUS_ID: 0,
      DELIVERY_DATE: new Date().toISOString(),
      SENDER_FULLNAME: params.pickupAddress.recipientName,
      SENDER_ADDRESS: params.pickupAddress.address,
      SENDER_PHONE: params.pickupAddress.phone,
      SENDER_WARD: 0,
      SENDER_DISTRICT: 0,
      SENDER_PROVINCE: 0,
      RECEIVER_FULLNAME: params.deliveryAddress.recipientName,
      RECEIVER_ADDRESS: params.deliveryAddress.address,
      RECEIVER_PHONE: params.deliveryAddress.phone,
      RECEIVER_WARD: 0,
      RECEIVER_DISTRICT: 0,
      RECEIVER_PROVINCE: 0,
      PRODUCT_NAME: `Đơn hàng ${params.orderId}`,
      PRODUCT_WEIGHT: params.weight,
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: optionalCarrierNonNegativeNumber(params.insuranceValue, 'ViettelPost insurance value', this.options.createError),
      PRODUCT_TYPE: 'HH',
      ORDER_PAYMENT: params.isCOD ? 3 : 1,
      ORDER_SERVICE: this.mapServiceType(params.serviceType),
      MONEY_COLLECTION: params.isCOD ? params.codAmount : 0,
      TYPE_INDICATE: 1,
      ...(params.note?.trim() ? { NOTE: params.note.trim() } : {}),
    };

    try {
      const resp = await (lastValueFrom as any)(
        this.httpService.post(url, payload, { headers: this.getHeaders(params.credentials) }),
      );

      if (resp.data.status !== 200) {
        throw this.createError(VIETTEL_POST_ERROR_MESSAGES.API_ERROR(carrierApiMessage(resp.data.message)));
      }

      const data = resp.data.data;
      return {
        trackingCode: data.ORDER_NUMBER,
        externalOrderCode: data.ORDER_REFERENCE || params.idempotencyKey,
        shippingFee: requireCarrierNonNegativeNumber(data.MONEY_TOTAL, 'ViettelPost create-order money total', this.options.createError),
      };
    } catch (error) {
      this.options.logger?.error?.(`Failed to create ViettelPost shipment: ${(error as Error).message}`);
      throw error;
    }
  }

  async cancelShipment(trackingCode: string, credentials: CarrierCredentials): Promise<void> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/v2/order/updateOrder`;
    const payload = {
      TYPE: 4,
      ORDER_NUMBER: trackingCode,
      NOTE: 'Hủy đơn hàng từ hệ thống',
    };

    const resp = await lastValueFrom(
      this.httpService.post<VtpApiResponse<VtpCancelData>>(url, payload, { headers: this.getHeaders(credentials) }),
    );

    if (resp.data.status !== 200) {
      throw this.createError(VIETTEL_POST_ERROR_MESSAGES.CANCEL_ERROR(resp.data.message));
    }
  }

  async getStatus(trackingCode: string, credentials: CarrierCredentials): Promise<CarrierStatusResult> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/v2/order/listOrder?ORDER_NUMBER=${trackingCode}`;

    const resp = await (lastValueFrom as any)(
      this.httpService.get(url, { headers: this.getHeaders(credentials) }),
    );

    if (resp.data.status !== 200 || !resp.data.data) {
      throw this.createError(VIETTEL_POST_ERROR_MESSAGES.TRACK_ERROR(resp.data.message));
    }

    const data = Array.isArray(resp.data.data) ? resp.data.data[0] : resp.data.data;
    if (!data) throw this.createError(VIETTEL_POST_ERROR_MESSAGES.SHIPMENT_NOT_FOUND);

    return {
      trackingCode: data.ORDER_NUMBER,
      status: this.mapVtpStatus(data.ORDER_STATUS),
      carrierRawStatus: data.ORDER_STATUS.toString(),
      timestamp: new Date(),
      location: optionalCarrierText(data.CURRENT_LOCATION),
    };
  }

  async calculateFee(params: FeeCalcParams): Promise<CarrierFeeResult[]> {
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const url = `${baseUrl}/v2/order/getPrice`;
    const serviceType = resolveShipmentServiceType(params.serviceType);

    const payload = {
      SENDER_PROVINCE: 0,
      SENDER_DISTRICT: 0,
      RECEIVER_PROVINCE: 0,
      RECEIVER_DISTRICT: 0,
      PRODUCT_WEIGHT: params.weight,
      PRODUCT_PRICE: optionalCarrierNonNegativeNumber(params.insuranceValue, 'ViettelPost insurance value', this.options.createError),
      MONEY_COLLECTION: params.isCOD ? params.codAmount : 0,
      TYPE_SERVICE: this.mapServiceType(serviceType),
    };

    try {
      const resp = await (lastValueFrom as any)(
        this.httpService.post(url, payload, { headers: this.getHeaders(params.credentials) }),
      );

      if (resp.data.status !== 200) return [];

      return [{
        carrierId: 'VIETTEL_POST',
        serviceType,
        fee: requireCarrierNonNegativeNumber(resp.data.data.MONEY_TOTAL, 'ViettelPost fee money total', this.options.createError),
        currency: 'VND',
        estimatedDays: 2,
      }];
    } catch (error) {
      this.options.logger?.warn?.(
        VIETTEL_POST_ERROR_MESSAGES.FEE_CALCULATION_FAILED(carrierCaughtErrorMessage(error)),
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async getLabel(trackingCode: string, _credentials: CarrierCredentials): Promise<LabelResult> {
    return {
      format: 'URL',
      data: `https://viettelpost.com.vn/tra-cuu-hanh-trinh?bill=${trackingCode}`,
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
      trackingCode: body['ORDER_NUMBER'] as string,
      status: this.mapVtpStatus(body['ORDER_STATUS'] as number),
      carrierRawStatus: String(body['ORDER_STATUS']),
      timestamp: body['ORDER_STATUSDATE'] ? new Date(body['ORDER_STATUSDATE'] as string) : new Date(),
      location: typeof body['LOCATION'] === 'string' && body['LOCATION'].trim()
        ? body['LOCATION'].trim()
        : undefined,
      rawPayload: body,
    };
  }

  protected getBaseUrl(testMode: boolean): string {
    return getViettelPostApiBaseUrl(testMode);
  }

  protected getHeaders(credentials: CarrierCredentials) {
    return {
      'Content-Type': 'application/json',
      'Token': credentials.apiToken,
    };
  }

  protected mapServiceType(type: string): string {
    switch (type) {
      case 'EXPRESS': return 'VCN';
      case 'STANDARD': return 'VTK';
      case 'ECONOMY': return 'VBS';
      default: return 'VTK';
    }
  }

  protected mapVtpStatus(vtpStatus: number | string): string {
    const s = parseInt(vtpStatus.toString());
    if (s <= 102) return VTP_SHIPMENT_STATUS.READY_TO_SHIP;
    if (s >= 103 && s <= 104) return VTP_SHIPMENT_STATUS.PICKED_UP;
    if (s === VIETTEL_POST_STATUS_CODES.IN_TRANSIT || (s >= 200 && s < 300)) return VTP_SHIPMENT_STATUS.IN_TRANSIT;
    if (s >= 300 && s < 500) return VTP_SHIPMENT_STATUS.OUT_FOR_DELIVERY;
    if (VIETTEL_POST_STATUS_CODES.DELIVERED.some((status) => status === s)) return VTP_SHIPMENT_STATUS.DELIVERED;
    if (VIETTEL_POST_STATUS_CODES.FAILED.some((status) => status === s)) return VTP_SHIPMENT_STATUS.FAILED_DELIVERY;
    if (VIETTEL_POST_STATUS_CODES.RETURNED.some((status) => status === s)) return VTP_SHIPMENT_STATUS.RETURNED;
    if (s === VIETTEL_POST_STATUS_CODES.CANCELLED) return VTP_SHIPMENT_STATUS.CANCELLED;
    return VTP_SHIPMENT_STATUS.IN_TRANSIT;
  }

  private createError(message: string): Error {
    return this.options.createError?.(message) ?? new ViettelPostCarrierError(message);
  }
}
