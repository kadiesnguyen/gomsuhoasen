import { QUOTE_STATUSES } from '@gomhoasen/contracts';
import { QuoteController } from './quote.controller';

describe('QuoteController', () => {
  function createHarness(quote: Record<string, unknown>) {
    const quoteService = {
      findAll: jest.fn(),
      findById: jest.fn(async () => quote),
      create: jest.fn(),
      update: jest.fn(),
      setPdfUrl: jest.fn(async (_id: string, pdfUrl: string) => ({ ...quote, pdfUrl })),
      markSent: jest.fn(async (_id: string, pdfUrl: string) => ({ ...quote, pdfUrl, status: QUOTE_STATUSES.SENT })),
    };
    const quotePdfService = {
      generate: jest.fn(async () => '/uploads/quotes/generated.pdf'),
    };
    const quoteEmailService = {
      sendQuote: jest.fn(async () => undefined),
    };
    const auditLogger = {
      log: jest.fn(async () => undefined),
    };

    return {
      quoteService,
      quotePdfService,
      quoteEmailService,
      auditLogger,
      controller: new QuoteController(
        quoteService as never,
        quotePdfService as never,
        quoteEmailService as never,
        auditLogger as never,
      ),
    };
  }

  it('reuses trimmed existing PDF URL when sending a quote', async () => {
    const { controller, quoteService, quotePdfService, quoteEmailService } = createHarness({
      _id: 'quote-1',
      pdfUrl: '  /uploads/quotes/quote-1.pdf  ',
    });

    await controller.send('quote-1', { userId: 'user-1' });

    expect(quotePdfService.generate).not.toHaveBeenCalled();
    expect(quoteService.setPdfUrl).toHaveBeenCalledWith('quote-1', '/uploads/quotes/quote-1.pdf');
    expect(quoteEmailService.sendQuote).toHaveBeenCalledWith(
      expect.objectContaining({ pdfUrl: '/uploads/quotes/quote-1.pdf' }),
      expect.stringContaining('quotes'),
    );
    expect(quoteService.markSent).toHaveBeenCalledWith('quote-1', '/uploads/quotes/quote-1.pdf');
  });

  it('generates PDF URL when the stored PDF URL is blank', async () => {
    const quote = {
      _id: 'quote-1',
      pdfUrl: '   ',
    };
    const { controller, quoteService, quotePdfService } = createHarness(quote);

    await controller.send('quote-1', { userId: 'user-1' });

    expect(quotePdfService.generate).toHaveBeenCalledWith(quote);
    expect(quoteService.setPdfUrl).toHaveBeenCalledWith('quote-1', '/uploads/quotes/generated.pdf');
    expect(quoteService.markSent).toHaveBeenCalledWith('quote-1', '/uploads/quotes/generated.pdf');
  });
});
