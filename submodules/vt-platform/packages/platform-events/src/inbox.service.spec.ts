import { InboxSchema } from './inbox.schema';
import { InboxService } from './inbox.service';

function createModel() {
  return {
    createIndexes: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  };
}

const envelope = {
  eventId: 'event-1',
  tenantId: 'tenant-1',
  eventType: 'catalog.product.upserted.v1',
  correlationId: 'correlation-1',
};

describe('InboxService durable idempotency', () => {
  it('declares the consumer-scoped unique index and creates indexes on startup', async () => {
    const index = InboxSchema.indexes().find(([fields, options]) => {
      return (
        options?.unique === true &&
        fields.eventId === 1 &&
        fields.consumerGroup === 1
      );
    });

    expect(index).toBeDefined();
    const model = createModel();
    const service = new InboxService(model as never);

    await service.ensureIndexes();

    expect(model.createIndexes).toHaveBeenCalledTimes(1);
  });

  it('suppresses an already-processed duplicate for the same consumer group', async () => {
    const model = createModel();
    model.create.mockRejectedValue({ code: 11000 });
    model.findOneAndUpdate.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
    const service = new InboxService(model as never);

    await expect(service.lockEnvelope(envelope, 'support-projection')).resolves.toBe(false);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { eventId: envelope.eventId, consumerGroup: 'support-projection', status: 'FAILED' },
      expect.any(Object),
      { returnDocument: 'after' },
    );
  });

  it('reclaims failed delivery and records terminal processing state', async () => {
    const model = createModel();
    model.create.mockRejectedValue({ code: 11000 });
    model.findOneAndUpdate.mockReturnValue({ exec: vi.fn().mockResolvedValue({ status: 'PENDING' }) });
    const service = new InboxService(model as never);

    await expect(service.lockEnvelope(envelope, 'support-projection')).resolves.toBe(true);
    await service.fail(envelope.eventId, 'support-projection', new Error('handler failed'));
    await service.complete(envelope.eventId, 'support-projection');

    expect(model.updateOne).toHaveBeenNthCalledWith(1,
      { eventId: envelope.eventId, consumerGroup: 'support-projection' },
      { $set: { status: 'FAILED', lastError: 'handler failed' } },
    );
    expect(model.updateOne).toHaveBeenNthCalledWith(2,
      { eventId: envelope.eventId, consumerGroup: 'support-projection' },
      { $set: { status: 'PROCESSED', processedAt: expect.any(Date) } },
    );
  });
});
