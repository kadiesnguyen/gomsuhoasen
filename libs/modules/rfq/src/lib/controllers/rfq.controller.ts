import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { Public, Roles } from '@gomhoasen/iam';
import { RfqService } from '../services/rfq.service';
import { GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS, type RfqStatus } from '@gomhoasen/contracts';
import { CreateRfqDto, UpdateRfqStatusDto } from '../dto/rfq.dto';

// Public endpoint — showroom form submission
@Controller(GHS_CONTROLLERS.RFQ.PUBLIC)
export class PublicRfqController {
  constructor(private rfqService: RfqService) {}

  @Public()
  @Post()
  async submit(@Body() body: CreateRfqDto) {
    return this.rfqService.create(body);
  }
}

// Admin endpoint — RFQ inbox
@Controller(GHS_CONTROLLERS.RFQ.ADMIN)
export class RfqController {
  constructor(private rfqService: RfqService) {}

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get()
  async findAll(@Query() query: { status?: RfqStatus }) {
    return this.rfqService.findAll(query);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get(GHS_METHODS.COMMON.BY_ID)
  async findById(@Param('id') id: string) {
    return this.rfqService.findById(id);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Patch(GHS_METHODS.RFQ.STATUS)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateRfqStatusDto,
  ) {
    return this.rfqService.updateStatus(id, body.status, body.internalNote, { session: null });
  }
}
