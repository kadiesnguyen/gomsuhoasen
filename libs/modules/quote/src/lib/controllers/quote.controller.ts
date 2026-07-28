import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, Roles, RolesGuard, AuditLoggerService } from '@gomhoasen/iam';
import { CreateQuoteDto, UpdateQuoteDto } from '../dto/quote.dto';
import { QuoteEmailService } from '../services/quote-email.service';
import { QuotePdfService } from '../services/quote-pdf.service';
import { QuoteService } from '../services/quote.service';
import { resolve } from 'node:path';
import { uploadRoot } from '@gomhoasen/core';
import { publicUploadPathToStorageKey } from '@vt/platform-file-core/browser';
import { GHS_AUDIT_ACTIONS, GHS_AUDIT_ENTITIES, GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS, type QuoteStatus } from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';

@Controller(GHS_CONTROLLERS.QUOTE.ADMIN)
@UseGuards(RolesGuard)
export class QuoteController {
  constructor(
    private readonly quoteService: QuoteService,
    private readonly quotePdfService: QuotePdfService,
    private readonly quoteEmailService: QuoteEmailService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get()
  async findAll(@Query() query: { status?: QuoteStatus; search?: string }) {
    return this.quoteService.findAll(query);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get(GHS_METHODS.COMMON.BY_ID)
  async findById(@Param('id') id: string) {
    return this.quoteService.findById(id);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post()
  async create(@Body() dto: CreateQuoteDto, @CurrentUser() user?: { userId?: string }) {
    const quote = await this.quoteService.create(dto, user?.userId);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.CREATE_QUOTE, entity: GHS_AUDIT_ENTITIES.QUOTE, entityId: String(quote._id) });
    return quote;
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Patch(GHS_METHODS.COMMON.BY_ID)
  async update(@Param('id') id: string, @Body() dto: UpdateQuoteDto, @CurrentUser() user?: { userId?: string }) {
    const quote = await this.quoteService.update(id, dto);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.UPDATE_QUOTE, entity: GHS_AUDIT_ENTITIES.QUOTE, entityId: id });
    return quote;
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post(GHS_METHODS.QUOTE.PDF)
  async generatePdf(@Param('id') id: string, @CurrentUser() user?: { userId?: string }) {
    const quote = await this.quoteService.findById(id);
    const pdfUrl = await this.quotePdfService.generate(quote);
    const result = await this.quoteService.setPdfUrl(id, pdfUrl);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.GENERATE_PDF, entity: GHS_AUDIT_ENTITIES.QUOTE, entityId: id });
    return result;
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post(GHS_METHODS.QUOTE.SEND)
  async send(@Param('id') id: string, @CurrentUser() user?: { userId?: string }) {
    let quote = await this.quoteService.findById(id);
    const pdfUrl = readTrimmedString(quote.pdfUrl) ?? await this.quotePdfService.generate(quote);
    quote = await this.quoteService.setPdfUrl(id, pdfUrl);
    await this.quoteEmailService.sendQuote(quote, resolve(uploadRoot(), publicUploadPathToStorageKey(pdfUrl)));
    const result = await this.quoteService.markSent(id, pdfUrl);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.SEND_QUOTE, entity: GHS_AUDIT_ENTITIES.QUOTE, entityId: id });
    return result;
  }
}
