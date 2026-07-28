import { Module, forwardRef } from '@nestjs/common';
import { IamModule } from '@gomhoasen/iam';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformEventsModule } from '@vt/platform-events';
import { RfqModule } from '@gomhoasen/rfq';
import { SiteModule } from '@gomhoasen/site';
import { QuoteController } from './controllers/quote.controller';
import { PublicQuoteController } from './controllers/public-quote.controller';
import { Counter, CounterSchema } from './schemas/counter.schema';
import { Quote, QuoteSchema } from './schemas/quote.schema';
import { QuoteEmailService } from './services/quote-email.service';
import { QuotePdfService } from './services/quote-pdf.service';
import { LocalPdfRendererModule } from './services/pdf-renderer.service';
import { QuoteService } from './services/quote.service';

@Module({
  imports: [
    ConfigModule,
    RfqModule,
    SiteModule,
    LocalPdfRendererModule,
    forwardRef(() => IamModule),
    PlatformEventsModule,
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [QuoteController, PublicQuoteController],
  providers: [QuoteService, QuotePdfService, QuoteEmailService],
  exports: [QuoteService],
})
export class QuoteModule {}
