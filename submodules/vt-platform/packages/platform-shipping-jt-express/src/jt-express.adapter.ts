/**
 * @vt/platform-shipping-jt-express — J&T Express carrier adapter.
 *
 * Implements ICarrierAdapter for J&T Express V2 API.
 * Uses MD5 + Base64 signature for request authentication.
 */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { createHash, timingSafeEqual } from 'crypto';
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
  DEFAULT_SHIPMENT_ITEM_NAME,
  gramsToKilograms,
  optionalCarrierNonNegativeNumber,
  optionalCarrierText,
  requireCarrierNonNegativeNumber,
  requireCarrierText,
} from '@vt/platform-shipping-core';

const JT_EXPRESS_TIME = {
  ESTIMATED_DELIVERY_DAYS: 3,
  HOURS_PER_DAY: 24,
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_MINUTE: 60,
  MILLISECONDS_PER_SECOND: 1000,
} as const;

interface JtResponseItem {
  success: string;
  reason?: string;
  mailno?: string;
  orderid?: string;
  txlogisticid_fee?: string;
}

interface JtCreateOrderResponse {
  responseitems: JtResponseItem[];
}

interface JtTrackDetail {
  scanstatus?: string;
  scantime?: string;
  scansite?: string;
}

interface JtTrackResponseItem {
  details?: JtTrackDetail[];
}

interface JtTrackResponse {
  responseitems?: JtTrackResponseItem[];
}

interface JtFeeResponse {
  fee?: string;
}

export interface JtExpressAdapterOptions {
  createError?: (message: string) => Error;
  logger?: {
    log?(message: string): void;
    warn?(message: string, trace?: string): void;
    error?(message: string, trace?: string): void;
  };
}

export class JtExpressCarrierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JtExpressCarrierError';
  }
}

export const JT_SHIPMENT_STATUS = {
  READY_TO_SHIP: 'READY_TO_SHIP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED_DELIVERY: 'FAILED_DELIVERY',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;

export const JT_EXPRESS_ERROR_MESSAGES = {
  MISSING_CREATE_ORDER_RESPONSE_ITEM: 'J&T Error: missing create-order response item',
  API_ERROR: (message: unknown) => `J&T Error: ${message}`,
  MISSING_LATEST_TRACKING_STATUS: 'J&T Error: missing latest tracking status',
} as const;

@Injectable()
export class JtExpressAdapter implements ICarrierAdapter {
  readonly carrierId: CarrierId = 'JT_EXPRESS';
  readonly capabilities: CarrierCapability[] = [
    'CREATE_SHIPMENT', 'CANCEL_SHIPMENT', 'TRACKING', 'CALCULATE_FEE', 'WEBHOOK',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly options: JtExpressAdapterOptions = {},
  ) {}

  async createShipment(params: CreateShipmentParams): Promise<CarrierShipmentResult> {
    const { credentials } = params;
    const baseUrl = this.getApiUrl(credentials.testMode);
    const shopId = requireCarrierText(credentials.shopId, 'J&T ecommerce id', this.options.createError);
    const pickupSiteCode = requireCarrierText(
      params.pickupAddress.carrierWardId,
      'J&T pickup site code',
      this.options.createError,
    );
    const destinationAreaCode = requireCarrierText(
      params.deliveryAddress.carrierWardId,
      'J&T destination area code',
      this.options.createError,
    );

    const payload = {
      eccommerce_id: shopId,
      orderid: params.orderId,
      sender_name: params.pickupAddress.recipientName,
      sender_phone: params.pickupAddress.phone,
      sender_address: params.pickupAddress.address,
      sender_province: params.pickupAddress.city,
      sender_city: params.pickupAddress.district,
      sender_area: params.pickupAddress.ward,
      receiver_name: params.deliveryAddress.recipientName,
      receiver_phone: params.deliveryAddress.phone,
      receiver_address: params.deliveryAddress.address,
      receiver_province: params.deliveryAddress.city,
      receiver_city: params.deliveryAddress.district,
      receiver_area: params.deliveryAddress.ward,
      weight: gramsToKilograms(params.weight),
      item_name: optionalCarrierText(params.note) ?? DEFAULT_SHIPMENT_ITEM_NAME,
      goods_type: 'EZ',
      cod_amount: params.isCOD ? params.codAmount : 0,
      insurance_amount: optionalCarrierNonNegativeNumber(params.insuranceValue, 'J&T insurance value', this.options.createError),
      sendSiteCode: pickupSiteCode,
      destAreaCode: destinationAreaCode,
    };

    const dataStr = JSON.stringify(payload);
    const signature = this.generateSignature(dataStr, credentials.apiToken);

    try {
      const response = await lastValueFrom(
        this.httpService.post(`${baseUrl}/order/create`, {
          logistics_interface: dataStr,
          data_digest: signature,
          msg_type: 'ORDERCREATE',
          eccommerce_id: shopId,
        }),
      );

      const result = response.data;
      const item = result.responseitems?.[0];
      if (!item) {
        throw this.createError(JT_EXPRESS_ERROR_MESSAGES.MISSING_CREATE_ORDER_RESPONSE_ITEM);
      }
      if (item.success === 'false') {
        throw this.createError(JT_EXPRESS_ERROR_MESSAGES.API_ERROR(item.reason));
      }

      return {
        trackingCode: requireCarrierText(item.mailno, 'J&T tracking code', this.options.createError),
        externalOrderCode: item.orderid,
        shippingFee: requireCarrierNonNegativeNumber(item.txlogisticid_fee, 'J&T shipment fee', this.options.createError),
        estimatedDelivery: new Date(
          Date.now()
            + JT_EXPRESS_TIME.ESTIMATED_DELIVERY_DAYS
              * JT_EXPRESS_TIME.HOURS_PER_DAY
              * JT_EXPRESS_TIME.MINUTES_PER_HOUR
              * JT_EXPRESS_TIME.SECONDS_PER_MINUTE
              * JT_EXPRESS_TIME.MILLISECONDS_PER_SECOND,
        ),
      };
    } catch (error) {
      this.options.logger?.error?.(`Failed to create J&T shipment: ${(error as Error).message}`);
      throw error;
    }
  }

  async cancelShipment(trackingCode: string, credentials: CarrierCredentials): Promise<void> {
    const baseUrl = this.getApiUrl(credentials.testMode);
    const shopId = requireCarrierText(credentials.shopId, 'J&T ecommerce id', this.options.createError);
    const payload = {
      eccommerce_id: shopId,
      mailno: trackingCode,
      msg_type: 'ORDERCANCEL',
    };

    const dataStr = JSON.stringify(payload);
    const signature = this.generateSignature(dataStr, credentials.apiToken);

    await lastValueFrom(
      this.httpService.post(`${baseUrl}/order/cancel`, {
        logistics_interface: dataStr,
        data_digest: signature,
        msg_type: 'ORDERCANCEL',
        eccommerce_id: shopId,
      }),
    );
  }

  async calculateFee(params: FeeCalcParams): Promise<CarrierFeeResult[]> {
    const { credentials } = params;
    const baseUrl = this.getApiUrl(credentials.testMode);
    const shopId = requireCarrierText(credentials.shopId, 'J&T ecommerce id', this.options.createError);

    const payload = {
      eccommerce_id: shopId,
      sender_province: params.pickupAddress.city,
      receiver_province: params.deliveryAddress.city,
      weight: gramsToKilograms(params.weight),
    };

    const dataStr = JSON.stringify(payload);
    const signature = this.generateSignature(dataStr, credentials.apiToken);

    const response = await lastValueFrom(
      this.httpService.post(`${baseUrl}/tariff/query`, {
        logistics_interface: dataStr,
        data_digest: signature,
        msg_type: 'TARIFFQUERY',
        eccommerce_id: shopId,
      }),
    );

    const fee = requireCarrierNonNegativeNumber(response.data.fee, 'J&T fee', this.options.createError);
    return [{
      carrierId: this.carrierId,
      serviceType: 'STANDARD',
      fee,
      currency: 'VND',
      estimatedDays: 3,
    }];
  }

  async getStatus(trackingCode: string, credentials: CarrierCredentials): Promise<CarrierStatusResult> {
    const baseUrl = this.getApiUrl(credentials.testMode);
    const shopId = requireCarrierText(credentials.shopId, 'J&T ecommerce id', this.options.createError);
    const payload = {
      eccommerce_id: shopId,
      mailno: trackingCode,
    };

    const dataStr = JSON.stringify(payload);
    const signature = this.generateSignature(dataStr, credentials.apiToken);

    const response = await lastValueFrom(
      this.httpService.post(`${baseUrl}/order/track`, {
        logistics_interface: dataStr,
        data_digest: signature,
        msg_type: 'ORDERTRACK',
        eccommerce_id: shopId,
      }),
    );

    const tracks = response.data.responseitems?.[0]?.details ?? [];
    const latest = tracks[tracks.length - 1];
    if (!latest?.scanstatus) {
      throw this.createError(JT_EXPRESS_ERROR_MESSAGES.MISSING_LATEST_TRACKING_STATUS);
    }

    return {
      trackingCode,
      status: this.mapStatus(latest?.scanstatus),
      carrierRawStatus: latest.scanstatus,
      timestamp: latest?.scantime ? new Date(latest.scantime) : new Date(),
      location: latest?.scansite,
    };
  }

  async getLabel(trackingCode: string, _credentials: CarrierCredentials): Promise<LabelResult> {
    return {
      format: 'URL',
      data: `https://api.jtexpress.vn/v2/print?mailno=${trackingCode}`,
    };
  }

  verifyWebhookSignature(
    _headers: Record<string, string>,
    _body: WebhookPayload,
    _secret?: string,
  ): boolean {
    const digest = _body['data_digest'];
    const dataStr = _body['logistics_interface'];
    if (typeof digest !== 'string' || typeof dataStr !== 'string' || !_secret) {
      return false;
    }

    const expected = this.generateSignature(dataStr, _secret);

    const bufDigest = Buffer.from(digest);
    const bufExpected = Buffer.from(expected);
    if (bufDigest.length !== bufExpected.length) {
      return false;
    }
    return timingSafeEqual(bufDigest, bufExpected);
  }

  parseWebhookPayload(body: WebhookPayload): NormalizedTrackingEvent {
    const data: WebhookPayload = typeof body['logistics_interface'] === 'string'
      ? JSON.parse(body['logistics_interface'] as string) as WebhookPayload
      : body;

    return {
      trackingCode: data['mailno'] as string,
      status: this.mapStatus(data['status'] as string),
      carrierRawStatus: data['status'] as string,
      timestamp: data['scantime'] ? new Date(data['scantime'] as string) : new Date(),
      location: data['scansite'] as string | undefined,
      rawPayload: body,
    };
  }

  protected generateSignature(data: string, key: string): string {
    const hash = createHash('md5').update(data + key).digest('hex');
    return Buffer.from(hash).toString('base64');
  }

  protected getApiUrl(testMode: boolean): string {
    return testMode
      ? 'https://dev-api.jtexpress.vn/v2'
      : 'https://api.jtexpress.vn/v2';
  }

  protected mapStatus(jtStatus: string | undefined): string {
    switch (jtStatus?.toUpperCase()) {
      case 'PICKUP': return JT_SHIPMENT_STATUS.PICKED_UP;
      case 'DEPARTURE':
      case 'ARRIVAL': return JT_SHIPMENT_STATUS.IN_TRANSIT;
      case 'SENT_SCAN': return JT_SHIPMENT_STATUS.OUT_FOR_DELIVERY;
      case 'SIGNED': return JT_SHIPMENT_STATUS.DELIVERED;
      case 'PROBLEM': return JT_SHIPMENT_STATUS.FAILED_DELIVERY;
      case 'CANCEL': return JT_SHIPMENT_STATUS.CANCELLED;
      case 'RETURNING': return JT_SHIPMENT_STATUS.RETURNED;
      default: return JT_SHIPMENT_STATUS.IN_TRANSIT;
    }
  }

  private createError(message: string): Error {
    return this.options.createError?.(message) ?? new JtExpressCarrierError(message);
  }
}
