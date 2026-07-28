import { QuoteEmailService } from './quote-email.service';
import { type ISmtpTransport } from '@vt/platform-comms-email-smtp';
import { QUOTE_ERROR_CODES } from '@vt/platform-error';

describe('QuoteEmailService', () => {
  const quote = {
    _id: 'quote-id-1',
    code: 'Q-001',
    customerEmail: '  buyer@example.com  ',
    customerName: 'Buyer',
    total: 1200000,
  } as any;

  function createService(overrides: Record<string, string | undefined> = {}) {
    const values: Record<string, string | undefined> = {
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'mailer@example.com',
      SMTP_PASS: 'secret',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_FROM: 'Sales <sales@example.com>',
      ...overrides,
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    };
    const siteConfig = {
      getConfig: jest.fn().mockResolvedValue({ brandName: 'Gốm Hoa Sen' }),
    };
    const service = new QuoteEmailService(config as any, siteConfig as any);
    const transport: jest.Mocked<ISmtpTransport> = {
      send: jest.fn().mockResolvedValue({ messageId: 'smtp-1', response: 'OK' }),
      verify: jest.fn().mockResolvedValue(true),
    };
    Object.defineProperty(service, 'smtpTransport', { value: transport });

    return { service, config, siteConfig, transport };
  }

  it('sends quote emails through the platform SMTP comms adapter with PDF attachment', async () => {
    const { service, transport } = createService();

    await service.sendQuote(quote, 'uploads/quotes/Q-001.pdf');

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        auth: { user: 'mailer@example.com', pass: 'secret' },
      }),
      expect.objectContaining({
        from: 'Sales <sales@example.com>',
        to: 'buyer@example.com',
        subject: 'Báo giá Q-001 từ Gốm Hoa Sen',
        attachments: [{ filename: 'Q-001.pdf', path: 'uploads/quotes/Q-001.pdf' }],
      }),
    );
  });

  it('rejects quotes without usable customer email', async () => {
    const { service, transport } = createService();

    await expect(service.sendQuote({ ...quote, customerEmail: undefined }, 'quote.pdf')).rejects.toMatchObject({
      errorCode: 'MISSING_REQUIRED_FIELD',
    });
    await expect(service.sendQuote({ ...quote, customerEmail: '   ' }, 'quote.pdf')).rejects.toMatchObject({
      errorCode: 'MISSING_REQUIRED_FIELD',
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('rejects missing SMTP_PORT without falling back to a default port', async () => {
    const { service, transport } = createService({ SMTP_PORT: undefined });

    await expect(service.sendQuote(quote, 'quote.pdf')).rejects.toMatchObject({
      errorCode: QUOTE_ERROR_CODES.QUOTE_SMTP_NOT_CONFIGURED,
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('rejects invalid SMTP_SECURE without inferring a boolean value', async () => {
    const { service, transport } = createService({ SMTP_SECURE: 'yes' });

    await expect(service.sendQuote(quote, 'quote.pdf')).rejects.toMatchObject({
      errorCode: QUOTE_ERROR_CODES.QUOTE_SMTP_NOT_CONFIGURED,
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('throws QUOTE_EMAIL_SEND_FAILED when the channel adapter returns a failed delivery outcome', async () => {
    const { service, transport } = createService();
    transport.send.mockRejectedValueOnce(new Error('smtp unavailable'));

    await expect(service.sendQuote(quote, 'quote.pdf')).rejects.toMatchObject({
      errorCode: QUOTE_ERROR_CODES.QUOTE_EMAIL_SEND_FAILED,
    });
  });
});
