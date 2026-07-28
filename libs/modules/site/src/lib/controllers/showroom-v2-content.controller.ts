import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuditLoggerService, CurrentUser, Public, Roles, RolesGuard } from '@gomhoasen/iam';
import {
  GHS_AUDIT_ACTIONS,
  GHS_AUDIT_ENTITIES,
  GHS_CONTROLLERS,
  USER_ROLE_GROUPS,
} from '@gomhoasen/contracts';
import { ShowroomV2ContentService } from '../services/showroom-v2-content.service';
import { UpdateShowroomV2ContentDto } from '../dto/showroom-v2-content.dto';

@Controller(GHS_CONTROLLERS.SITE.V2_CONTENT)
@UseGuards(RolesGuard)
export class ShowroomV2ContentController {
  constructor(
    private readonly v2ContentService: ShowroomV2ContentService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  @Public()
  @Get()
  async getContent() {
    return this.v2ContentService.getContent();
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Put()
  async updateContent(
    @Body() dto: UpdateShowroomV2ContentDto,
    @CurrentUser() user?: { userId?: string },
  ) {
    const content = await this.v2ContentService.updateContent(dto);
    await this.auditLogger.log({
      userId: user?.userId,
      action: GHS_AUDIT_ACTIONS.UPDATE_SHOWROOM_V2_CONTENT,
      entity: GHS_AUDIT_ENTITIES.SHOWROOM_V2_CONTENT,
      entityId: 'singleton_v2_content',
      payload: { sections: Object.keys(dto) },
    });
    return content;
  }
}
