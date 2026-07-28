export const RFQ_STATUSES = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUOTED: 'QUOTED',
  CLOSED: 'CLOSED',
} as const;

export type RfqStatus = (typeof RFQ_STATUSES)[keyof typeof RFQ_STATUSES];

export const RFQ_STATUS_VALUES = Object.values(RFQ_STATUSES) as RfqStatus[];

export const RFQ_SOURCES = {
  PRODUCT_DETAIL: 'PRODUCT_DETAIL',
  CONTACT_PANEL: 'CONTACT_PANEL',
  CONTACT_PAGE: 'CONTACT_PAGE',
  ADMIN: 'ADMIN',
} as const;

export type RfqSource = (typeof RFQ_SOURCES)[keyof typeof RFQ_SOURCES];

export const RFQ_SOURCE_VALUES = Object.values(RFQ_SOURCES) as RfqSource[];

export interface QuoteRequestContract {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  message?: string;
  productIds: string[];
  status: RfqStatus;
  source: RfqSource;
  createdAt: string;
}
