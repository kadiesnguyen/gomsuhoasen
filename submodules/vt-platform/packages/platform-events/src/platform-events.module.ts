import { type DynamicModule, Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Inbox, InboxSchema } from './inbox.schema';
import { InboxService } from './inbox.service';
import type { OutboxDocument } from './outbox.schema';
import { Outbox, OutboxSchema } from './outbox.schema';
import { OutboxPollerService } from './outbox-poller.service';
import {
  PLATFORM_OUTBOX_PUBLISHER,
  OutboxService,
  type OutboxPublisher,
} from './outbox.service';

@Module({})
class PlatformEventsNamedConnectionModule {}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Outbox.name, schema: OutboxSchema },
      { name: Inbox.name, schema: InboxSchema },
    ]),
  ],
  providers: [OutboxService, InboxService, OutboxPollerService],
  exports: [OutboxService, InboxService, OutboxPollerService],
})
export class PlatformEventsModule {
  static forConnection(connectionName: string): DynamicModule {
    const normalizedConnectionName = connectionName.trim();
    if (!normalizedConnectionName) {
      throw new Error('PlatformEventsModule.forConnection requires connectionName');
    }
    const outboxModelToken = getModelToken(Outbox.name, normalizedConnectionName);
    const inboxModelToken = getModelToken(Inbox.name, normalizedConnectionName);
    return {
      module: PlatformEventsNamedConnectionModule,
      imports: [
        MongooseModule.forFeature([
          { name: Outbox.name, schema: OutboxSchema },
          { name: Inbox.name, schema: InboxSchema },
        ], normalizedConnectionName),
      ],
      providers: [
        {
          provide: OutboxService,
          inject: [
            outboxModelToken,
            { token: PLATFORM_OUTBOX_PUBLISHER, optional: true },
          ],
          useFactory: (
            model: Model<Outbox>,
            publisher?: OutboxPublisher,
          ) => new OutboxService(model, publisher),
        },
        {
          provide: InboxService,
          inject: [inboxModelToken],
          useFactory: (model: Model<Inbox>) => new InboxService(model),
        },
        {
          provide: OutboxPollerService,
          inject: [outboxModelToken, EventEmitter2],
          useFactory: (
            model: Model<OutboxDocument>,
            eventEmitter: EventEmitter2,
          ) => new OutboxPollerService(model, eventEmitter),
        },
      ],
      exports: [MongooseModule, OutboxService, InboxService, OutboxPollerService],
    };
  }
}
