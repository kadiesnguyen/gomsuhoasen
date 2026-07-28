// Refs read: v2/libs/catalog/src/lib/controllers/public/public-catalog.controller.ts
// Kept: @Public() route for showroom consumption
// Dropped: tenant resolution

import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '@gomhoasen/iam';
import { ProductService } from '../services/product.service';
import { GHS_CONTROLLERS, GHS_METHODS, PRODUCT_STATUSES } from '@gomhoasen/contracts';

@Controller(GHS_CONTROLLERS.CATALOG.PUBLIC_CATALOG)
export class PublicCatalogController {
  constructor(private productService: ProductService) {}

  @Public()
  @Get(GHS_METHODS.CATALOG.PUBLIC_PRODUCTS)
  async listActive(@Query() query: { collection?: string; search?: string }) {
    return this.productService.findAll({ ...query, status: PRODUCT_STATUSES.ACTIVE });
  }

  @Public()
  @Get(GHS_METHODS.CATALOG.PUBLIC_PRODUCT_BY_SLUG)
  async findBySlug(@Param('slug') slug: string) {
    return this.productService.findActiveBySlug(slug);
  }
}
