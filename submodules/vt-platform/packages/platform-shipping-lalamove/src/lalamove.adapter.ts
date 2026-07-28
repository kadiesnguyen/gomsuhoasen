/**
 * @vt/platform-shipping-lalamove — Lalamove carrier adapter.
 *
 * Implements ICarrierAdapter for Lalamove V3 API.
 * Uses HMAC-SHA256 signature for request authentication.
 * Two-step flow: quotation → order placement.
 */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
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
  requireCarrierNonNegativeNumber,
  requireCarrierText,
  resolveShipmentServiceType,
} from '@vt/platform-shipping-core';

interface LalamoveStop { stopId: string; }

interface LalamoveQuoteData {
  quotationId: string;
  stops: LalamoveStop[];
  price: { amount: string; currency: string };
}

interface LalamoveQuoteResponse { data: LalamoveQuoteData; }
interface LalamoveOrderData { orderId: string; status?: string; }
interface LalamoveOrderResponse { data: LalamoveOrderData; }
interface LalamoveOrderStatusData { orderId: string; status: string; }
interface LalamoveOrderStatusResponse { data: LalamoveOrderStatusData; }
interface LalamoveCancelResponse { message?: string; }

export interface LalamoveAdapterOptions {
  createError?: (message: string) => Error;
  logger?: {
    log?(message: string): void;
    warn?(message: string, trace?: string): void;
    error?(message: string, trace?: string): void;
  };
}

export class LalamoveCarrierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LalamoveCarrierError';
  }
}

export const LALAMOVE_SHIPMENT_STATUS = {
  READY_TO_SHIP: 'READY_TO_SHIP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const LALAMOVE_ERROR_MESSAGES = {
  QUOTE_ERROR: (message: string) => `Lalamove Quote Error: ${message}`,
  ORDER_ERROR: (message: string) => `Lalamove Order Error: ${message}`,
  CANCEL_ERROR: (message: unknown) => `Lalamove Cancel Error: ${message}`,
  TRACK_ERROR: (message: unknown) => `Lalamove Track Error: ${message}`,
  FEE_CALCULATION_FAILED: (message: string) => `Lalamove fee calculation failed: ${message}`,
} as const;

@Injectable()
export class LalamoveAdapter implements ICarrierAdapter {
  readonly carrierId: CarrierId = 'LALAMOVE';
  readonly capabilities: CarrierCapability[] = [
    'CREATE_SHIPMENT', 'CANCEL_SHIPMENT', 'CALCULATE_FEE', 'TRACKING',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly options: LalamoveAdapterOptions = {},
  ) {}

  async createShipment(params: CreateShipmentParams): Promise<CarrierShipmentResult> {
    this.options.logger?.log?.(`Creating Lalamove shipment for order ${params.orderId}`);
    const baseUrl = this.getBaseUrl(params.credentials.testMode);

    // Step 1: Get Quotation
    const quotationPath = '/v3/quotations';
    const quotationBody = {
      data: {
        serviceType: this.mapServiceType(params.serviceType),
        stops: [
          {
            address: params.pickupAddress.address,
            name: params.pickupAddress.recipientName,
            phone: params.pickupAddress.phone,
          },
          {
            address: params.deliveryAddress.address,
            name: params.deliveryAddress.recipientName,
            phone: params.deliveryAddress.phone,
          },
        ],
        item: {
          quantity: '1',
          weight: gramsToKilograms(params.weight).toString(),
          categories: ['FOOD_AND_BEVERAGE'],
          handlingInstructions: params.note?.trim() ? [params.note.trim()] : [],
        },
        isStandardFeeRange: true,
      },
    };

    try {
      const quoteResp = await lastValueFrom(
        this.httpService.post(baseUrl + quotationPath, quotationBody, {
          headers: this.getHeaders('POST', quotationPath, quotationBody, params.credentials),
        }),
      );

      if (quoteResp.status !== 201) {
        throw this.createError(LALAMOVE_ERROR_MESSAGES.QUOTE_ERROR(carrierApiMessage((quoteResp.data as { message?: string }).message)));
      }

      const quotationId = quoteResp.data.data.quotationId;
      const senderStopId = requireCarrierText(
        quoteResp.data.data.stops[0]?.stopId,
        'Lalamove sender stop id',
        this.options.createError,
      );
      const receiverStopId = requireCarrierText(
        quoteResp.data.data.stops[1]?.stopId,
        'Lalamove receiver stop id',
        this.options.createError,
      );

      // Step 2: Place Order
      const orderPath = '/v3/orders';
      const orderBody = {
        data: {
          quotationId,
          sender: {
            stopId: senderStopId,
            name: params.pickupAddress.recipientName,
            phone: params.pickupAddress.phone,
          },
          receiver: {
            stopId: receiverStopId,
            name: params.deliveryAddress.recipientName,
            phone: params.deliveryAddress.phone,
          },
          isPriorityOrder: false,
        },
      };

      const orderResp = await lastValueFrom(
        this.httpService.post(baseUrl + orderPath, orderBody, {
          headers: this.getHeaders('POST', orderPath, orderBody, params.credentials),
        }),
      );

      if (orderResp.status !== 201) {
        throw this.createError(LALAMOVE_ERROR_MESSAGES.ORDER_ERROR(carrierApiMessage((orderResp.data as { message?: string }).message)));
      }

      return {
        trackingCode: orderResp.data.data.orderId,
        externalOrderCode: orderResp.data.data.orderId,
        shippingFee: requireCarrierNonNegativeNumber(quoteResp.data.data.price.amount, 'Lalamove quote price amount', this.options.createError),
      };
    } catch (error) {
      this.options.logger?.error?.(`Failed to create Lalamove shipment: ${(error as Error).message}`);
      throw error;
    }
  }

  async cancelShipment(trackingCode: string, credentials: CarrierCredentials): Promise<void> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const path = `/v3/orders/${trackingCode}`;

    const resp = await lastValueFrom(
      this.httpService.delete(baseUrl + path, {
        headers: this.getHeaders('DELETE', path, null, credentials),
      }),
    );

    if (resp.status !== 200 && resp.status !== 204) {
      throw this.createError(LALAMOVE_ERROR_MESSAGES.CANCEL_ERROR(resp.data?.message));
    }
  }

  async getStatus(trackingCode: string, credentials: CarrierCredentials): Promise<CarrierStatusResult> {
    const baseUrl = this.getBaseUrl(credentials.testMode);
    const path = `/v3/orders/${trackingCode}`;

    const resp = await lastValueFrom(
      this.httpService.get(baseUrl + path, {
        headers: this.getHeaders('GET', path, null, credentials),
      }),
    );

    if (resp.status !== 200) {
      throw this.createError(LALAMOVE_ERROR_MESSAGES.TRACK_ERROR((resp.data as { message?: string }).message));
    }

    return {
      trackingCode: resp.data.data.orderId,
      status: this.mapLalaStatus(resp.data.data.status),
      carrierRawStatus: resp.data.data.status,
      timestamp: new Date(),
    };
  }

  async calculateFee(params: FeeCalcParams): Promise<CarrierFeeResult[]> {
    const baseUrl = this.getBaseUrl(params.credentials.testMode);
    const path = '/v3/quotations';
    const serviceType = resolveShipmentServiceType(params.serviceType);
    const body = {
      data: {
        serviceType: this.mapServiceType(serviceType),
        stops: [
          { address: params.pickupAddress.address },
          { address: params.deliveryAddress.address },
        ],
        item: {
          quantity: '1',
          weight: gramsToKilograms(params.weight).toString(),
          categories: ['FOOD_AND_BEVERAGE'],
        },
      },
    };

    try {
      const resp = await lastValueFrom(
        this.httpService.post(baseUrl + path, body, {
          headers: this.getHeaders('POST', path, body, params.credentials),
        }),
      );

      if (resp.status !== 201) return [];

      return [{
        carrierId: 'LALAMOVE',
        serviceType,
        fee: requireCarrierNonNegativeNumber(resp.data.data.price.amount, 'Lalamove fee quote price amount', this.options.createError),
        currency: 'VND',
        estimatedDays: 0,
      }];
    } catch (error) {
      this.options.logger?.warn?.(
        LALAMOVE_ERROR_MESSAGES.FEE_CALCULATION_FAILED(carrierCaughtErrorMessage(error)),
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async getLabel(trackingCode: string, _credentials: CarrierCredentials): Promise<LabelResult> {
    return {
      format: 'URL',
      data: `https://lalamove.com/tracking?id=${trackingCode}`,
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
    const data = body['data'] as WebhookPayload | undefined;
    return {
      trackingCode: (data?.['orderId'] ?? body['orderId']) as string,
      status: this.mapLalaStatus((data?.['status'] ?? body['status']) as string),
      carrierRawStatus: (data?.['status'] ?? body['status']) as string,
      timestamp: new Date(),
      location: '',
      rawPayload: body,
    };
  }

  protected getBaseUrl(testMode: boolean): string {
    return testMode
      ? 'https://rest.sandbox.lalamove.com'
      : 'https://rest.lalamove.com';
  }

  protected getHeaders(method: string, path: string, body: object | null, credentials: CarrierCredentials) {
    const timestamp = Date.now().toString();
    const payload = body ? JSON.stringify(body) : '';
    const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${payload}`;
    const apiToken = requireCarrierText(credentials.apiToken, 'Lalamove api token', this.options.createError);
    const apiSecret = requireCarrierText(credentials.apiSecret, 'Lalamove api secret', this.options.createError);
    const market = requireCarrierText(credentials.market, 'Lalamove market', this.options.createError);

    const signature = createHmac('sha256', apiSecret)
      .update(rawSignature)
      .digest('hex');

    return {
      'Content-Type': 'application/json',
      'Authorization': `hmac ${apiToken}:${timestamp}:${signature}`,
      'Market': market,
    };
  }

  protected mapServiceType(type: string): string {
    switch (type) {
      case 'EXPRESS': return 'MOTORCYCLE';
      case 'STANDARD': return 'MOTORCYCLE';
      default: return 'MOTORCYCLE';
    }
  }

  protected mapLalaStatus(status: string): string {
    const s = status.toUpperCase();
    switch (s) {
      case 'ASSIGNING_DRIVER': return LALAMOVE_SHIPMENT_STATUS.READY_TO_SHIP;
      case 'ON_THE_WAY': return LALAMOVE_SHIPMENT_STATUS.PICKED_UP;
      case 'PICKED_UP': return LALAMOVE_SHIPMENT_STATUS.IN_TRANSIT;
      case 'COMPLETED': return LALAMOVE_SHIPMENT_STATUS.DELIVERED;
      case 'CANCELED':
      case 'EXPIRED': return LALAMOVE_SHIPMENT_STATUS.CANCELLED;
      default: return LALAMOVE_SHIPMENT_STATUS.IN_TRANSIT;
    }
  }

  private createError(message: string): Error {
    return this.options.createError?.(message) ?? new LalamoveCarrierError(message);
  }
}
