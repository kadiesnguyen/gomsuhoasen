import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@gomhoasen/iam';
import { QuoteService } from '../services/quote.service';
import { GHS_CONTROLLERS, GHS_METHODS } from '@gomhoasen/contracts';

@Controller(GHS_CONTROLLERS.QUOTE.PUBLIC)
export class PublicQuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get(GHS_METHODS.COMMON.BY_ID)
  async findPublic(@Param('id') id: string) {
    const quote = await this.quoteService.findPublicByShareToken(id);
    return {
      _id: quote._id,
      code: quote.code,
      customerName: quote.customerName,
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      terms: quote.terms,
      validUntil: quote.validUntil,
      pdfUrl: quote.pdfUrl,
      status: quote.status,
      sentAt: quote.sentAt,
    };
  }
}
