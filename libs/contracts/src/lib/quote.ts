export const QUOTE_STATUSES = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[keyof typeof QUOTE_STATUSES];

export const QUOTE_STATUS_VALUES = Object.values(QUOTE_STATUSES) as QuoteStatus[];

export interface QuoteContract {
  id: string;
  rfqId?: string;
  quoteNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: QuoteStatus;
  totalAmount: number;
  pdfUrl?: string;
}
