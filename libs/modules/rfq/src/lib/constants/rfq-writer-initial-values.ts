import { readArrayInput } from '@vt/common-utils';

import { RfqStatus, type RfqSource } from '../schemas/rfq.schema';

export const RFQ_DEFAULT_LINE_ITEM_QUANTITY = 1;

export interface RfqLineItemInitialValuesInput {
  productId: string;
  productName: string;
  variant?: string;
  quantity?: number;
  note?: string;
}

export interface RfqInitialValuesInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCompany?: string;
  message?: string;
  lineItems?: RfqLineItemInitialValuesInput[];
  productIds?: string[];
  source: RfqSource;
  internalNote?: string;
  assignedTo?: string;
  status?: RfqStatus;
}

export type RfqLineItemInitialValues = Omit<RfqLineItemInitialValuesInput, 'quantity'> & {
  quantity: number;
};

export type RfqInitialValues = Omit<RfqInitialValuesInput, 'lineItems' | 'productIds' | 'status'> & {
  lineItems: RfqLineItemInitialValues[];
  status: RfqStatus;
};

function buildInitialRfqLineItems(input: RfqInitialValuesInput): RfqLineItemInitialValues[] {
  const lineItems = readArrayInput<RfqLineItemInitialValuesInput>(input.lineItems);
  const sourceItems: RfqLineItemInitialValuesInput[] = lineItems.length > 0
    ? lineItems
    : readArrayInput<string>(input.productIds).map((productId) => ({
        productId,
        productName: productId,
      }));

  return sourceItems.map((item) => ({
    ...item,
    quantity: item.quantity ?? RFQ_DEFAULT_LINE_ITEM_QUANTITY,
  }));
}

export function buildInitialRfqValues(input: RfqInitialValuesInput): RfqInitialValues {
  return {
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    customerCompany: input.customerCompany,
    message: input.message,
    source: input.source,
    internalNote: input.internalNote,
    assignedTo: input.assignedTo,
    lineItems: buildInitialRfqLineItems(input),
    status: input.status ?? RfqStatus.NEW,
  };
}
