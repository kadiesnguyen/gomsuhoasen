import { applyInitialValues } from '@vt/common-utils';
import type { Types } from 'mongoose';
import { QuoteLineItem, QuoteStatus } from '../schemas/quote.schema';

export interface QuoteInitialValuesInput {
  code: string;
  rfqId: Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: QuoteLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  terms?: string;
  validUntil?: Date;
  createdBy?: Types.ObjectId;
  status?: QuoteStatus;
}

export type QuoteInitialValues = Omit<QuoteInitialValuesInput, 'status'> & {
  status: QuoteStatus;
};

export const QUOTE_INITIAL_VALUES = Object.freeze({
  status: QuoteStatus.DRAFT,
} satisfies Pick<QuoteInitialValues, 'status'>);

export function buildInitialQuoteValues(input: QuoteInitialValuesInput): QuoteInitialValues {
  return applyInitialValues<
    QuoteInitialValuesInput,
    Pick<QuoteInitialValues, 'status'>
  >(input, QUOTE_INITIAL_VALUES) as QuoteInitialValues;
}
