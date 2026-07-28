import { Logger } from '@nestjs/common';
import type { ClientSession } from 'mongoose';
import { OUTBOX_SERVICE_ERROR_MESSAGES, OutboxService } from './outbox.service';
import { OutboxStatus } from './outbox.schema';

class MockOutboxModel {
  static readonly save = vi.fn();

  eventType?: string;
  payload?: Record<string, unknown>;
  status?: OutboxStatus;
  tenantId?: string;
  correlationId?: string;

  constructor(data: Record<string, unknown>) {
    Object.assign(this, data);
  }

  async save(options: unknown): Promise<this> {
    MockOutboxModel.save(options);
    return this;
  }
}

describe('OutboxService explicit session intent', () => {
  beforeEach(() => {
    MockOutboxModel.save.mockClear();
  });

  it('stages advisory outbox events with explicit null session intent', async () => {
    const service = new OutboxService(MockOutboxModel as never, { emit: vi.fn() } as never);

    const event = await service.stage('advisory.event', { ok: true }, null, {
      tenantId: 'tenant-1',
    });

    expect(event).toEqual(expect.objectContaining({
      eventType: 'advisory.event',
      payload: { ok: true },
      status: OutboxStatus.NEW,
      tenantId: 'tenant-1',
      correlationId: expect.any(String),
    }));
    expect(MockOutboxModel.save).toHaveBeenCalledWith({ session: null });
  });

  it('stages transactional outbox events with the caller session', async () => {
    const service = new OutboxService(MockOutboxModel as never, { emit: vi.fn() } as never);
    const session = { id: 'session-1' } as unknown as ClientSession;

    await service.stage('transactional.event', { ok: true }, session, {
      tenantId: 'tenant-1',
    });

    expect(MockOutboxModel.save).toHaveBeenCalledWith({ session });
  });

  it('trims caller correlation ids instead of treating them as falsy fallbacks', async () => {
    const service = new OutboxService(MockOutboxModel as never, { emit: vi.fn() } as never);

    const event = await service.stage('correlated.event', { ok: true }, null, {
      tenantId: 'tenant-1',
      correlationId: '  corr-1  ',
    });

    expect(event).toEqual(expect.objectContaining({
      correlationId: 'corr-1',
    }));
  });

  it('rejects events without explicit tenant metadata', async () => {
    const service = new OutboxService(MockOutboxModel as never, { emit: vi.fn() } as never);
    const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(service.stage('missing-tenant.event', { ok: true }, null)).rejects.toThrow(
      OUTBOX_SERVICE_ERROR_MESSAGES.MISSING_TENANT('missing-tenant.event'),
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      OUTBOX_SERVICE_ERROR_MESSAGES.MISSING_TENANT_LOG('missing-tenant.event'),
    );
    loggerSpy.mockRestore();
  });
});
