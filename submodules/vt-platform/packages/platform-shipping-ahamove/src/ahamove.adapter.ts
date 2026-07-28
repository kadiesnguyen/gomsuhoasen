/**
 * @vt/platform-shipping-ahamove — Ahamove carrier adapter.
 *
 * Implements ICarrierAdapter for Ahamove V3 API.
 * On-demand delivery (motorcycle/van), point-to-point routing.
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
  requireCarrierNonNegativeNumber,
  resolveShipmentServiceType,
} from '@vt/platform-shipping-core';

interface AhamoveCreateOrderBody {
  order_id: string;
  total_fee: number;
  message?: string;
}

interface AhamoveCancelOrderBody {
  message?: string;
}

interface AhamoveOrderStatusBody {
  order_id: string;
  status: string;
  message?: string;
}

interface AhamoveFeeEstimateBody {
  total_fee?: number;
  total_price?: number;
}

export interface AhamoveAdapterOptions {
  createError?: (message: string) => Error;
  logger?: {
    log?(message: string): void;
    warn?(message: string, trace?: string): void;
    error?(message: string, trace?: string): void;
  };
}

export class AhamoveCarrierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AhamoveCarrierError';
  }
}

export const AHAMOVE_SHIPMENT_STATUS = {
  DRAFT: 'DRAFT',
  READY_TO_SHIP: 'READY_TO_SHIP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED_DELIVERY: 'FAILED_DELIVERY',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;

export const AHAMOVE_ERROR_MESSAGES = {
  API_ERROR: (message: string) => `Ahamove Error: ${message}`,
  CANCEL_ERROR: (message: unknown) => `Ahamove Cancel Error: ${message}`,
  TRACK_ERROR: (message: unknown) => `Ahamove Track Error: ${message}`,
  FEE_CALCULATION_FAILED: (message: string) => `Ahamove fee calculation failed: ${message}`,
} as const;

@Injectable()
export class AhamoveAdapter implements ICarrierAdapter {
  readonly carrierId: CarrierId = 'AHAMOVE';
  readonly capabilities: CarrierCapability[] = [
    'CREATE_SHIPMENT', 'CANCEL_SHIPMENT', 'CALCULATE_FEE', 'TRACKING',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly options: AhamoveAdapterOptions = {},
  ) {}

  async createShipment(params: CreateShipmentParams): Promise<CarrierShipmentResult> {
    this.options.logger?.log?.(`Creating Ahamove shipment for order ${params.orderId}`);
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const url = `${baseUrl}/v3/orders`;

    const payload = {
      order_id: params.idempotencyKey,
      service_id: this.mapServiceId(params.serviceType),
      path: [
        {
          address: params.pickupAddress.address,
          short_address: params.pickupAddress.city,
          name: params.pickupAddress.recipientName,
          phone: params.pickupAddress.phone,
        },
        {
          address: params.deliveryAddress.address,
          short_address: params.deliveryAddress.city,
          name: params.deliveryAddress.recipientName,
          phone: params.deliveryAddress.phone,
          cod: params.isCOD ? params.codAmount : 0,
        },
      ],
      payment_method: 'BALANCE',
      status: 'IDLE',
    };

    try {
      const resp = await lastValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders(params.credentials) }),
      );

      if (resp.status !== 200 && resp.status !== 201) {
        throw this.createError(AHAMOVE_ERROR_MESSAGES.API_ERROR(carrierApiMessage(resp.data?.message)));
      }

      return {
        trackingCode: resp.data.order_id,
        externalOrderCode: resp.data.order_id,
        shippingFee: requireCarrierNonNegativeNumber(resp.data.total_fee, 'Ahamove create-order total fee', this.options.createError),
      };
    } catch (error) {
      this.options.logger?.error?.(`Failed to create Ahamove shipment: ${(error as Error).message}`);
      throw error;
    }
  }

  async cancelShipment(trackingCode: string, credentials: CarrierCredentials): Promise<void> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/v3/orders/${trackingCode}/cancel`;

    const resp = await lastValueFrom(
      this.httpService.post(url, { comment: 'Cancelled by user' }, { headers: this.getHeaders(credentials) }),
    );

    if (resp.status !== 200) {
      throw this.createError(AHAMOVE_ERROR_MESSAGES.CANCEL_ERROR(resp.data?.message));
    }
  }

  async getStatus(trackingCode: string, credentials: CarrierCredentials): Promise<CarrierStatusResult> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const url = `${baseUrl}/v3/orders/${trackingCode}`;

    const resp = await lastValueFrom(
      this.httpService.get(url, { headers: this.getHeaders(credentials) }),
    );

    if (resp.status !== 200) {
      throw this.createError(AHAMOVE_ERROR_MESSAGES.TRACK_ERROR(resp.data?.message));
    }

    return {
      trackingCode: resp.data.order_id,
      status: this.mapAhaStatus(resp.data.status),
      carrierRawStatus: resp.data.status,
      timestamp: new Date(),
    };
  }

  async calculateFee(params: FeeCalcParams): Promise<CarrierFeeResult[]> {
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const url = `${baseUrl}/v3/orders/estimates`;
    const serviceType = resolveShipmentServiceType(params.serviceType);

    const payload = {
      service_id: this.mapServiceId(serviceType),
      path: [
        { address: params.pickupAddress.address },
        { address: params.deliveryAddress.address },
      ],
    };

    try {
      const resp = await lastValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders(params.credentials) }),
      );

      if (resp.status !== 200) return [];

      const estimates = Array.isArray(resp.data) ? resp.data[0] : resp.data;
      if (!estimates) return [];

      return [{
        carrierId: 'AHAMOVE',
        serviceType,
        fee: requireCarrierNonNegativeNumber(
          estimates.total_fee ?? estimates.total_price,
          'Ahamove estimate fee',
          this.options.createError,
        ),
        currency: 'VND',
        estimatedDays: 0,
      }];
    } catch (error) {
      this.options.logger?.warn?.(
        AHAMOVE_ERROR_MESSAGES.FEE_CALCULATION_FAILED(carrierCaughtErrorMessage(error)),
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async getLabel(trackingCode: string, _credentials: CarrierCredentials): Promise<LabelResult> {
    return {
      format: 'URL',
      data: `https://ahamove.com/tracking?id=${trackingCode}`,
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
      trackingCode: body['order_id'] as string,
      status: this.mapAhaStatus(body['status'] as string),
      carrierRawStatus: body['status'] as string,
      timestamp: new Date(),
      location: '',
      rawPayload: body,
    };
  }

  protected getBaseUrl(testMode: boolean): string {
    return testMode
      ? 'https://partner-apistg.ahamove.com'
      : 'https://partner-api.ahamove.com';
  }

  protected getHeaders(credentials: CarrierCredentials) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credentials.apiToken}`,
    };
  }

  protected mapServiceId(type: string): string {
    switch (type) {
      case 'EXPRESS': return 'SGN-POI-90';
      case 'STANDARD': return 'SGN-BIKE';
      default: return 'SGN-BIKE';
    }
  }

  protected mapAhaStatus(ahaStatus: string): string {
    const s = ahaStatus.toUpperCase();
    switch (s) {
      case 'IDLE': return AHAMOVE_SHIPMENT_STATUS.DRAFT;
      case 'ASSIGNING':
      case 'ACCEPTED': return AHAMOVE_SHIPMENT_STATUS.READY_TO_SHIP;
      case 'IN_PROCESS': return AHAMOVE_SHIPMENT_STATUS.PICKED_UP;
      case 'COMPLETED': return AHAMOVE_SHIPMENT_STATUS.DELIVERED;
      case 'CANCELLED': return AHAMOVE_SHIPMENT_STATUS.CANCELLED;
      case 'FAILED': return AHAMOVE_SHIPMENT_STATUS.FAILED_DELIVERY;
      case 'RETURNED': return AHAMOVE_SHIPMENT_STATUS.RETURNED;
      default: return AHAMOVE_SHIPMENT_STATUS.IN_TRANSIT;
    }
  }

  private createError(message: string): Error {
    return this.options.createError?.(message) ?? new AhamoveCarrierError(message);
  }
}
