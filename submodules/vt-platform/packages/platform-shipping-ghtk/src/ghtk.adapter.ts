/**
 * @vt/platform-shipping-ghtk — GHTK carrier adapter.
 *
 * Implements ICarrierAdapter for Giao Hàng Tiết Kiệm.
 * Pure TypeScript + NestJS HttpService.
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
  gramsToKilograms,
  optionalCarrierNonNegativeNumber,
  requireCarrierNonNegativeNumber,
  requireCarrierText,
} from '@vt/platform-shipping-core';

// ─── GHTK API Response Bodies ─────────────────────────

interface GhtkOrderData {
  label: string;
  fee: number;
  estimated_pick_time?: string;
  estimated_deliver_time?: string;
  status?: string;
  label_id?: string;
}

interface GhtkCreateOrderResponse {
  success: boolean;
  message?: string;
  error_code?: string;
  order?: GhtkOrderData;
}

interface GhtkOrderStatusResponse {
  success: boolean;
  message?: string;
  order?: {
    label: string;
    status: string;
    label_id?: string;
  };
}

interface GhtkFeeResponse {
  success: boolean;
  message?: string;
  fee?: { fee: number };
}

interface GhtkCancelResponse {
  success: boolean;
  message?: string;
}

export interface GhtkAdapterOptions {
  createError?: (message: string) => Error;
  logger?: {
    log?(message: string): void;
    warn?(message: string, trace?: string): void;
    error?(message: string, trace?: string): void;
  };
}

export class GhtkCarrierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GhtkCarrierError';
  }
}

export const GHTK_SHIPMENT_STATUS = {
  READY_TO_SHIP: 'READY_TO_SHIP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED_DELIVERY: 'FAILED_DELIVERY',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;

export const GHTK_ERROR_MESSAGES = {
  API_ERROR: (message: string) => `GHTK Error: ${message}`,
  CANCEL_ERROR: (message: unknown) => `GHTK Cancel Error: ${message}`,
  TRACK_ERROR: (message: unknown) => `GHTK Track Error: ${message}`,
  NO_ORDER_DATA: 'GHTK: No order data in response',
  FEE_CALCULATION_FAILED: (message: string) => `GHTK fee calculation failed: ${message}`,
} as const;

@Injectable()
export class GhtkAdapter implements ICarrierAdapter {
  readonly carrierId: CarrierId = 'GHTK';
  readonly capabilities: CarrierCapability[] = [
    'CREATE_SHIPMENT', 'CANCEL_SHIPMENT', 'CALCULATE_FEE',
    'GET_LABEL', 'TRACKING', 'COD',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly options: GhtkAdapterOptions = {},
  ) {}

  async createShipment(params: CreateShipmentParams): Promise<CarrierShipmentResult> {
    this.options.logger?.log?.(`Creating GHTK shipment for order ${params.orderId}`);
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const url = `${baseUrl}/services/shipment/order`;

    const payload = {
      products: [{
        name: `Sản phẩm đơn hàng ${params.orderId}`,
        weight: gramsToKilograms(params.weight),
        quantity: 1,
      }],
      order: {
        id: params.idempotencyKey,
        pick_name: params.pickupAddress.recipientName,
        pick_address: params.pickupAddress.address,
        pick_province: params.pickupAddress.city,
        pick_district: params.pickupAddress.district,
        pick_tel: params.pickupAddress.phone,
        tel: params.deliveryAddress.phone,
        name: params.deliveryAddress.recipientName,
        address: params.deliveryAddress.address,
        province: params.deliveryAddress.city,
        district: params.deliveryAddress.district,
        is_freeship: params.isCOD ? '0' : '1',
        pick_money: params.isCOD ? params.codAmount : 0,
        ...(params.note?.trim() ? { note: params.note.trim() } : {}),
        value: optionalCarrierNonNegativeNumber(
          params.insuranceValue ?? params.codAmount,
          'GHTK declared value',
          this.options.createError,
        ),
      },
    };

    try {
      const resp = await lastValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders(params.credentials) }),
      );

      if (!resp.data.success) {
        if (resp.data.error_code === 'ORDER_ID_EXIST' && resp.data.order) {
          return {
            trackingCode: requireCarrierText(resp.data.order.label, 'GHTK duplicate order label', this.options.createError),
            externalOrderCode: requireCarrierText(resp.data.order.label, 'GHTK duplicate order label', this.options.createError),
            shippingFee: requireCarrierNonNegativeNumber(resp.data.order.fee, 'GHTK duplicate order fee', this.options.createError),
          };
        }
        throw this.createError(GHTK_ERROR_MESSAGES.API_ERROR(carrierApiMessage(resp.data.message)));
      }

      const data = resp.data.order as GhtkOrderData;
      return {
        trackingCode: requireCarrierText(data.label, 'GHTK order label', this.options.createError),
        externalOrderCode: requireCarrierText(data.label, 'GHTK order label', this.options.createError),
        shippingFee: requireCarrierNonNegativeNumber(data.fee, 'GHTK order fee', this.options.createError),
        estimatedDelivery: data.estimated_pick_time ? new Date(data.estimated_pick_time) : undefined,
      };
    } catch (error) {
      this.options.logger?.error?.(`Failed to create GHTK shipment: ${(error as Error).message}`);
      throw error;
    }
  }

  async cancelShipment(trackingCode: string, credentials: CarrierCredentials): Promise<void> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/services/shipment/cancel/${trackingCode}`;

    const resp = await lastValueFrom(
      this.httpService.post(url, {}, { headers: this.getHeaders(credentials) }),
    );

    if (!resp.data.success) {
      throw this.createError(GHTK_ERROR_MESSAGES.CANCEL_ERROR(resp.data.message));
    }
  }

  async getStatus(trackingCode: string, credentials: CarrierCredentials): Promise<CarrierStatusResult> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/services/shipment/v2/${trackingCode}`;

    const resp = await lastValueFrom(
      this.httpService.get(url, { headers: this.getHeaders(credentials) }),
    );

    if (!resp.data.success) {
      throw this.createError(GHTK_ERROR_MESSAGES.TRACK_ERROR(resp.data.message));
    }

    const data = resp.data.order;
    if (!data) throw this.createError(GHTK_ERROR_MESSAGES.NO_ORDER_DATA);

    return {
      trackingCode: data.label,
      status: this.mapGhtkStatus(data.status),
      carrierRawStatus: data.status,
      timestamp: new Date(),
    };
  }

  async calculateFee(params: FeeCalcParams): Promise<CarrierFeeResult[]> {
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const url = `${baseUrl}/services/shipment/fee`;

    const query = {
      pick_province: params.pickupAddress.city,
      pick_district: params.pickupAddress.district,
      province: params.deliveryAddress.city,
      district: params.deliveryAddress.district,
      weight: params.weight,
      value: optionalCarrierNonNegativeNumber(params.insuranceValue, 'GHTK insurance value', this.options.createError),
      deliver_option: 'none',
    };

    try {
      const resp = await lastValueFrom(
        this.httpService.get(url, { params: query, headers: this.getHeaders(params.credentials) }),
      );

      if (!resp.data.success) return [];

      return [{
        carrierId: 'GHTK',
        serviceType: 'STANDARD',
        fee: requireCarrierNonNegativeNumber(resp.data.fee?.fee, 'GHTK fee', this.options.createError),
        currency: 'VND',
        estimatedDays: 3,
      }];
    } catch (error) {
      this.options.logger?.warn?.(
        GHTK_ERROR_MESSAGES.FEE_CALCULATION_FAILED(carrierCaughtErrorMessage(error)),
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async getLabel(trackingCode: string, credentials: CarrierCredentials): Promise<LabelResult> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    return {
      format: 'URL',
      data: `${baseUrl}/open_api/v1/label/${trackingCode}`,
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
      trackingCode: body['label_id'] as string,
      status: this.mapGhtkStatus(body['status_id'] as string | number),
      carrierRawStatus: String(body['status_id']),
      timestamp: body['action_time'] ? new Date(body['action_time'] as string) : new Date(),
      location: '',
      rawPayload: body,
    };
  }

  protected getBaseUrl(testMode: boolean): string {
    return testMode
      ? 'https://services.giaohangtietkiem.vn'
      : 'https://services.ghtk.vn';
  }

  protected getHeaders(credentials: CarrierCredentials) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Token': credentials.apiToken,
    };
    if (typeof credentials.clientSource === 'string' && credentials.clientSource.trim()) {
      headers['X-Client-Source'] = credentials.clientSource.trim();
    }
    return headers;
  }

  protected mapGhtkStatus(ghtkStatus: string | number): string {
    const s = ghtkStatus.toString();
    switch (s) {
      case '1': return GHTK_SHIPMENT_STATUS.READY_TO_SHIP;
      case '2':
      case '3': return GHTK_SHIPMENT_STATUS.PICKED_UP;
      case '4': return GHTK_SHIPMENT_STATUS.IN_TRANSIT;
      case '5': return GHTK_SHIPMENT_STATUS.OUT_FOR_DELIVERY;
      case '6': return GHTK_SHIPMENT_STATUS.DELIVERED;
      case '7': return GHTK_SHIPMENT_STATUS.FAILED_DELIVERY;
      case '8':
      case '9':
      case '10':
      case '11': return GHTK_SHIPMENT_STATUS.RETURNED;
      case '21':
      case '-1': return GHTK_SHIPMENT_STATUS.CANCELLED;
      default: return GHTK_SHIPMENT_STATUS.IN_TRANSIT;
    }
  }

  private createError(message: string): Error {
    return this.options.createError?.(message) ?? new GhtkCarrierError(message);
  }
}
