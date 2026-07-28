import { Injectable } from '@nestjs/common';
import type {
  CommsChannelAdapter,
  CommsChannelAdapterConfig,
  CommsChannelDeliveryResult,
  CommsChannelSendInput,
} from '@vt/platform-comms-engine';
import {
  COMMS_CHANNEL_DELIVERY_OUTCOME,
  COMMS_CHANNEL_TYPE,
  requireCommsChannelConfigKeys,
} from '@vt/platform-comms-engine';

export interface ZnsCommsTemplateParams {
  deliveryId: string;
  idempotencyKey: string;
  bodyText?: string;
  bodyHtml?: string;
}

export interface ZnsCommsSendRef {
  messageId: string;
}

export interface ZnsCommsProviderResult extends ZnsCommsSendRef {
  status?: string;
  phone?: string;
  templateId?: string;
  sentAt?: Date;
  quotaRemaining?: number;
  isSimulation?: boolean;
}

export interface ZnsCommsProviderPort {
  sendZns(
    tenantId: string,
    phone: string,
    templateId: string,
    params: Record<string, unknown>,
  ): Promise<ZnsCommsProviderResult>;
}

@Injectable()
export class ZnsCommsAdapter implements CommsChannelAdapter {
  readonly channelType = COMMS_CHANNEL_TYPE.ZNS;

  constructor(private readonly providerPort: ZnsCommsProviderPort) {}

  validateConfig(config: CommsChannelAdapterConfig) {
    return requireCommsChannelConfigKeys(config, ['oaId', 'accessToken']);
  }

  async send(input: CommsChannelSendInput): Promise<CommsChannelDeliveryResult> {
    const result = await this.providerPort.sendZns(
      input.tenantId,
      input.recipient.recipientContact,
      input.template.templateCode,
      {
        ...(input.templateVariables ?? {}),
        deliveryId: input.deliveryId,
        idempotencyKey: input.idempotencyKey,
        bodyText: input.template.bodyText,
        bodyHtml: input.template.bodyHtml,
      },
    );

    const providerMetadata = this.toProviderMetadata(result);

    return {
      outcome: COMMS_CHANNEL_DELIVERY_OUTCOME.ACCEPTED,
      providerMessageId: result.messageId,
      ...(providerMetadata ? { providerResponse: JSON.stringify(providerMetadata) } : {}),
      ...(result.sentAt ? { sentAt: result.sentAt } : {}),
    };
  }

  private toProviderMetadata(result: ZnsCommsProviderResult): Record<string, unknown> | undefined {
    const metadata: Record<string, unknown> = {};

    if (result.status !== undefined) metadata['status'] = result.status;
    if (result.phone !== undefined) metadata['phone'] = result.phone;
    if (result.templateId !== undefined) metadata['templateId'] = result.templateId;
    if (result.sentAt !== undefined) metadata['sentAt'] = result.sentAt;
    if (result.quotaRemaining !== undefined) metadata['quotaRemaining'] = result.quotaRemaining;
    if (result.isSimulation !== undefined) metadata['isSimulation'] = result.isSimulation;

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }
}
