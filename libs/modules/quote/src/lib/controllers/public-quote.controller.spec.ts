import { QuoteStatus } from '../schemas/quote.schema';
import { PublicQuoteController } from './public-quote.controller';

describe('PublicQuoteController', () => {
  it('resolves public quotes by share token instead of internal id', async () => {
    const quoteService = {
      findPublicByShareToken: jest.fn(async () => ({
        _id: 'quote-1',
        code: 'QUO-20260630-001',
        customerName: 'Khach hang',
        items: [{ productName: 'Binh gom', quantity: 1, unitPrice: 100000, lineTotal: 100000 }],
        subtotal: 100000,
        discount: 0,
        total: 100000,
        terms: 'Thanh toan',
        validUntil: new Date('2030-01-01T00:00:00.000Z'),
        pdfUrl: '/uploads/quotes/quote-1.pdf',
        status: QuoteStatus.SENT,
        sentAt: new Date('2026-06-30T09:00:00.000Z'),
      })),
    };
    const controller = new PublicQuoteController(quoteService as never);

    const result = await controller.findPublic('share-token-1');

    expect(quoteService.findPublicByShareToken).toHaveBeenCalledWith('share-token-1');
    expect(result).toEqual(expect.objectContaining({
      _id: 'quote-1',
      code: 'QUO-20260630-001',
      total: 100000,
      status: QuoteStatus.SENT,
    }));
  });
});
