// Task card: R3-007
// Refs read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/apps/v2-portal/src/pages/Dashboard.tsx
// - docs/03_ARCHITECTURE/API_DESIGN.md M5 Dashboard & Audit
// Kept: KPI cards backed by API data
// Dropped: tenant/platform/logistics metrics
// Adapted: GHS products, RFQ, quotes, artisans

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Roles, RolesGuard } from '@gomhoasen/iam';
import { ARTISAN_STATUSES, GHS_CONTROLLERS, GHS_METHODS, PRODUCT_STATUSES, QUOTE_STATUSES, RFQ_STATUSES, USER_ROLE_GROUPS } from '@gomhoasen/contracts';
import { parsePaginationQuery, buildPaginationMeta } from '@gomhoasen/core';

function readFiniteNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

@Controller(GHS_CONTROLLERS.DASHBOARD.MAIN)
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get(GHS_METHODS.DASHBOARD.STATS)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async stats() {
    const [productsActive, productsTotal, rfqNew, rfqTotal, quotesTotal, quotesSent, artisansActive, latestRfqs, latestQuotes] = await Promise.all([
      this.connection.collection('products').countDocuments({ status: PRODUCT_STATUSES.ACTIVE, isDeleted: { $ne: true } }),
      this.connection.collection('products').countDocuments({ isDeleted: { $ne: true } }),
      this.connection.collection('rfqs').countDocuments({ status: RFQ_STATUSES.NEW }),
      this.connection.collection('rfqs').countDocuments({}),
      this.connection.collection('quotes').countDocuments({}),
      this.connection.collection('quotes').countDocuments({ status: QUOTE_STATUSES.SENT }),
      this.connection.collection('artisans').countDocuments({ status: ARTISAN_STATUSES.ACTIVE, isDeleted: { $ne: true } }),
      this.connection.collection('rfqs').find({}).sort({ createdAt: -1 }).limit(5).toArray(),
      this.connection.collection('quotes').find({}).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);

    const acceptedQuotes = await this.connection.collection('quotes').find({ status: QUOTE_STATUSES.ACCEPTED }).toArray();
    const acceptedValue = acceptedQuotes.reduce((sum, quote) => sum + readFiniteNumber(quote.total), 0);

    // Chart Data (Last 7 days RFQs and Quotes)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0,0,0,0));
      const end = new Date(d.setHours(23,59,59,999));
      
      const [rfqCount, quoteCount] = await Promise.all([
        this.connection.collection('rfqs').countDocuments({ createdAt: { $gte: start, $lte: end } }),
        this.connection.collection('quotes').countDocuments({ createdAt: { $gte: start, $lte: end } }),
      ]);
      
      chartData.push({
        name: d.toLocaleDateString('vi', { weekday: 'short' }),
        rfqs: rfqCount,
        quotes: quoteCount
      });
    }

    return {
      productsActive,
      productsTotal,
      rfqNew,
      rfqTotal,
      quotesTotal,
      quotesSent,
      acceptedValue,
      artisansActive,
      latestRfqs,
      latestQuotes,
      chartData,
    };
  }
}

@Controller(GHS_CONTROLLERS.DASHBOARD.AUDIT_LOGS)
@UseGuards(RolesGuard)
export class AuditLogController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @Roles(...USER_ROLE_GROUPS.ADMIN_ONLY)
  async list(@Query() query: { actor?: string; action?: string; entity?: string; date?: string; page?: string; limit?: string }) {
    const filter: {
      action?: string;
      entity?: string;
      userId?: string;
      createdAt?: { $gte: Date; $lt: Date };
    } = {};
    if (query.action) filter.action = query.action;
    if (query.entity) filter.entity = query.entity;
    if (query.actor) filter.userId = query.actor;
    if (query.date) {
      const start = new Date(query.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }
    const { page, limit, skip } = parsePaginationQuery(query);
    const [items, total] = await Promise.all([
      this.connection.collection('audit_logs').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.connection.collection('audit_logs').countDocuments(filter),
    ]);
    return { items, ...buildPaginationMeta(total, page, limit) };
  }
}
