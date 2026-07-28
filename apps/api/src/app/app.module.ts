import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { OutboxPollerService } from '@vt/platform-events';
import { createPlatformImports, OutboxBootstrapMixin } from '@vt/app-bootstrap';
import { IamModule } from '@gomhoasen/iam';
import { CatalogModule } from '@gomhoasen/catalog';
import { RfqModule } from '@gomhoasen/rfq';
import { QuoteModule } from '@gomhoasen/quote';
import { ArtisanModule } from '@gomhoasen/artisan';
import { FileModule } from '@gomhoasen/file';
import { SiteModule } from '@gomhoasen/site';
import { HealthController } from './health.controller';
import { AuditLogController, DashboardController } from './dashboard.controller';
import { ShowroomV2SitemapController } from './showroom-v2-sitemap.controller';

/**
 * AppModule — MIGRATED to use createPlatformImports() from @vt/app-bootstrap.
 *
 * Before: 21 lines of inline ConfigModule + MongooseModule + EventEmitter + plugins setup
 * After:  1 line — ...createPlatformImports()
 *
 * Before: manual OnModuleInit + OutboxPollerService
 * After:  extends OutboxBootstrapMixin
 *
 * @see createPlatformImports in @vt/app-bootstrap
 */
@Module({
  imports: [
    ...createPlatformImports(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    IamModule,
    CatalogModule,
    RfqModule,
    QuoteModule,
    ArtisanModule,
    FileModule,
    SiteModule,
  ],
  controllers: [
    HealthController,
    DashboardController,
    AuditLogController,
    ShowroomV2SitemapController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule extends OutboxBootstrapMixin {
  constructor(outboxPoller: OutboxPollerService) {
    super(outboxPoller);
  }
}
