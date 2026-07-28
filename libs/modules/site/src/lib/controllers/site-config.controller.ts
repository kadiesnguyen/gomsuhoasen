import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Public, Roles, RolesGuard } from '@gomhoasen/iam';
import { UpdateSiteConfigDto } from '../dto/site-config.dto';
import { SiteConfigService } from '../services/site-config.service';
import { GHS_CONTROLLERS, USER_ROLE_GROUPS } from '@gomhoasen/contracts';

@Controller(GHS_CONTROLLERS.SITE.CONFIG)
@UseGuards(RolesGuard)
export class SiteConfigController {
  constructor(private readonly siteConfigService: SiteConfigService) {}

  @Public()
  @Get()
  async getConfig() {
    return this.siteConfigService.getConfig();
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Put()
  async updateConfig(@Body() dto: UpdateSiteConfigDto) {
    return this.siteConfigService.updateConfig(dto);
  }
}
