import { Controller, Get, Res } from '@nestjs/common';
import { ARTISAN_STATUSES, PRODUCT_STATUSES } from '@gomhoasen/contracts';
import { ArtisanService } from '@gomhoasen/artisan';
import { ProductService } from '@gomhoasen/catalog';
import { Public } from '@gomhoasen/iam';
import {
  ShowroomV2ContentService,
  createShowroomV2SitemapXml,
} from '@gomhoasen/site';
import type { Response } from 'express';

@Controller('site/v2-sitemap.xml')
export class ShowroomV2SitemapController {
  constructor(
    private readonly contentService: ShowroomV2ContentService,
    private readonly productService: ProductService,
    private readonly artisanService: ArtisanService,
  ) {}

  @Public()
  @Get()
  async getSitemap(@Res() response: Response): Promise<void> {
    const [content, products, artisans] = await Promise.all([
      this.contentService.getContent(),
      this.productService.findAll({ status: PRODUCT_STATUSES.ACTIVE }),
      this.artisanService.findAll({ status: ARTISAN_STATUSES.ACTIVE }),
    ]);
    const xml = createShowroomV2SitemapXml(content, products, artisans);

    response
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=300')
      .send(xml);
  }
}
