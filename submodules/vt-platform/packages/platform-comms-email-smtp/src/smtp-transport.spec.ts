import {
  NodemailerSmtpTransport,
  SmtpDeliveryError,
  SMTP_DELIVERY_ERROR_CODE,
  SmtpCommsChannelAdapter,
  type SmtpAttachment,
  renderSimpleTemplate,
} from './smtp-transport';

describe('NodemailerSmtpTransport', () => {
  const config = { host: 'smtp.test.invalid', port: 587, secure: false, auth: { user: 'u', pass: 'p' } };

  it('should classify connection errors', async () => {
    const connectionError = Object.assign(new Error('connection refused'), {
      code: 'ECONNREFUSED',
    });
    const close = vi.fn();
    const transport = createTransportWithStub({
      sendMail: vi.fn().mockRejectedValue(connectionError),
      close,
    });

    await expect(
      transport.send(config, {
        from: 'test@test.com',
        to: 'dest@test.com',
        subject: 'Test',
        bodyText: 'Hello',
      }),
    ).rejects.toMatchObject({
      name: 'SmtpDeliveryError',
      code: SMTP_DELIVERY_ERROR_CODE.CONNECTION_FAILED,
      originalError: connectionError,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('verify() should return false for invalid host', async () => {
    const close = vi.fn();
    const transport = createTransportWithStub({
      verify: vi.fn().mockRejectedValue(Object.assign(new Error('bad host'), {
        code: 'ENOTFOUND',
      })),
      close,
    });

    const result = await transport.verify(config);
    expect(result).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

type SmtpTransportMock = ReturnType<typeof vi.fn>;

function createTransportWithStub(overrides: {
  sendMail?: SmtpTransportMock;
  verify?: SmtpTransportMock;
  close?: SmtpTransportMock;
}): NodemailerSmtpTransport {
  const smtpStub = {
    sendMail: overrides.sendMail ?? vi.fn(),
    verify: overrides.verify ?? vi.fn(),
    close: overrides.close ?? vi.fn(),
  };
  const nodemailer = {
    createTransport: vi.fn(() => smtpStub),
  } as unknown as typeof import('nodemailer');

  return new NodemailerSmtpTransport(() => nodemailer);
}

describe('SmtpDeliveryError', () => {
  it('should preserve code and original error', () => {
    const original = new Error('connection refused');
    const err = new SmtpDeliveryError(
      SMTP_DELIVERY_ERROR_CODE.CONNECTION_FAILED,
      'Cannot connect',
      original,
    );
    expect(err.code).toBe('SMTP_CONNECTION_FAILED');
    expect(err.name).toBe('SmtpDeliveryError');
    expect(err.originalError).toBe(original);
    expect(err.message).toBe('Cannot connect');
  });
});

describe('SmtpSendParams', () => {
  it('supports attachment payloads for quote/PDF email consumers', () => {
    const attachments: SmtpAttachment[] = [
      { filename: 'quote.pdf', path: 'uploads/quotes/quote.pdf', contentType: 'application/pdf' },
    ];

    expect(attachments[0].filename).toBe('quote.pdf');
    expect(attachments[0].path).toBe('uploads/quotes/quote.pdf');
  });
});

describe('renderSimpleTemplate', () => {
  it('should replace {{key}} placeholders', () => {
    const result = renderSimpleTemplate(
      'Hello {{name}}, your order #{{orderId}} is ready.',
      { name: 'Alice', orderId: 42 },
    );
    expect(result).toBe('Hello Alice, your order #42 is ready.');
  });

  it('should handle missing keys as empty string', () => {
    const result = renderSimpleTemplate('Dear {{name}},', { name: undefined });
    expect(result).toBe('Dear ,');
  });

  it('should return empty string for empty template', () => {
    expect(renderSimpleTemplate('', { name: 'X' })).toBe('');
  });

  it('should handle null values', () => {
    const result = renderSimpleTemplate('Value: {{val}}', { val: null });
    expect(result).toBe('Value: ');
  });
});

describe('SmtpCommsChannelAdapter', () => {
  it('sends rendered comms templates through the SMTP transport port', async () => {
    const transport = {
      verify: vi.fn(),
      send: vi.fn().mockResolvedValue({
        messageId: 'smtp-1',
        accepted: ['customer@example.com'],
        rejected: [],
        response: '250 queued',
      }),
    };
    const adapter = new SmtpCommsChannelAdapter({
      transport,
      config: { host: 'smtp.example.com', port: 587, secure: false },
      from: 'Ops <ops@example.com>',
      now: () => new Date('2026-05-15T00:00:00.000Z'),
    });

    await expect(adapter.send({
      tenantId: 'tenant-1',
      deliveryId: 'delivery-1',
      idempotencyKey: 'idem-1',
      channelType: 'EMAIL',
      recipient: { recipientId: 'customer@example.com', recipientContact: 'customer@example.com' },
      template: {
        templateCode: 'welcome',
        templateVersion: 1,
        subject: 'Welcome',
        bodyHtml: '<p>Welcome</p>',
      },
    })).resolves.toMatchObject({
      outcome: 'DELIVERED',
      providerMessageId: 'smtp-1',
      providerResponse: '250 queued',
      sentAt: new Date('2026-05-15T00:00:00.000Z'),
    });

    expect(transport.send).toHaveBeenCalledWith(
      { host: 'smtp.example.com', port: 587, secure: false },
      expect.objectContaining({
        from: 'Ops <ops@example.com>',
        to: 'customer@example.com',
        subject: 'Welcome',
      }),
    );
  });

  it('passes attachment variables to the SMTP transport port', async () => {
    const transport = {
      verify: vi.fn(),
      send: vi.fn().mockResolvedValue({
        messageId: 'smtp-attachment',
        accepted: ['customer@example.com'],
        rejected: [],
        response: '250 queued',
      }),
    };
    const adapter = new SmtpCommsChannelAdapter({
      transport,
      config: { host: 'smtp.example.com', port: 587, secure: false },
      from: 'Ops <ops@example.com>',
    });

    await adapter.send({
      tenantId: 'tenant-1',
      deliveryId: 'delivery-attachment',
      idempotencyKey: 'idem-attachment',
      channelType: 'EMAIL',
      recipient: { recipientId: 'customer@example.com', recipientContact: 'customer@example.com' },
      template: {
        templateCode: 'quote',
        templateVersion: 1,
        subject: 'Quote',
        bodyHtml: '<p>Quote</p>',
      },
      templateVariables: {
        attachments: [
          { filename: 'quote.pdf', path: 'uploads/quotes/quote.pdf' },
          { invalid: true },
        ],
      },
    });

    expect(transport.send).toHaveBeenCalledWith(
      { host: 'smtp.example.com', port: 587, secure: false },
      expect.objectContaining({
        attachments: [{ filename: 'quote.pdf', path: 'uploads/quotes/quote.pdf' }],
      }),
    );
  });

  it('maps permanent SMTP failures to permanent channel outcomes', async () => {
    const adapter = new SmtpCommsChannelAdapter({
      transport: {
        verify: vi.fn(),
        send: vi.fn().mockRejectedValue(new SmtpDeliveryError(
          SMTP_DELIVERY_ERROR_CODE.AUTH_FAILED,
          'Auth failed',
        )),
      },
      config: { host: 'smtp.example.com', port: 587, secure: false },
      from: 'Ops <ops@example.com>',
    });

    await expect(adapter.send({
      tenantId: 'tenant-1',
      deliveryId: 'delivery-1',
      idempotencyKey: 'idem-1',
      channelType: 'EMAIL',
      recipient: { recipientId: 'customer@example.com', recipientContact: 'customer@example.com' },
      template: {
        templateCode: 'welcome',
        templateVersion: 1,
        subject: 'Welcome',
      },
    })).resolves.toMatchObject({
      outcome: 'PERMANENT_FAILURE',
      errorCode: 'SMTP_AUTH_FAILED',
    });
  });

  it('fails permanently before transport when sender address is missing', async () => {
    const transport = {
      verify: vi.fn(),
      send: vi.fn(),
    };
    const adapter = new SmtpCommsChannelAdapter({
      transport,
      config: { host: 'smtp.example.com', port: 587, secure: false },
      from: '   ',
    });

    await expect(adapter.send({
      tenantId: 'tenant-1',
      deliveryId: 'delivery-1',
      idempotencyKey: 'idem-1',
      channelType: 'EMAIL',
      recipient: { recipientId: 'customer@example.com', recipientContact: 'customer@example.com' },
      template: {
        templateCode: 'welcome',
        templateVersion: 1,
        subject: 'Welcome',
      },
    })).resolves.toMatchObject({
      outcome: 'PERMANENT_FAILURE',
      errorCode: 'SMTP_INVALID_MESSAGE',
      errorMessage: 'SMTP message from is required',
    });
    expect(transport.send).not.toHaveBeenCalled();
  });
});
