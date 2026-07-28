import { Controller, Get, Param, Query } from '@nestjs/common';
import { ARTISAN_STATUSES, GHS_CONTROLLERS, GHS_METHODS } from '@gomhoasen/contracts';
import { Public } from '@gomhoasen/iam';
import { ArtisanService } from '../services/artisan.service';

@Public()
@Controller(GHS_CONTROLLERS.ARTISAN.PUBLIC)
export class PublicArtisanController {
  constructor(private artisanService: ArtisanService) {}

  @Get()
  async findAll(@Query() query: { search?: string }) {
    return this.artisanService.findAll({ status: ARTISAN_STATUSES.ACTIVE, search: query.search });
  }

  @Get(GHS_METHODS.COMMON.BY_SLUG)
  async findBySlug(@Param('slug') slug: string) {
    return this.artisanService.findActiveBySlug(slug);
  }
}
