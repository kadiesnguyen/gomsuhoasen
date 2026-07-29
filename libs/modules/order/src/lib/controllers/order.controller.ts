import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { Public, Roles } from '@gomhoasen/iam';
import { OrderService } from '../services/order.service';
import { GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS, type OrderStatus } from '@gomhoasen/contracts';
import { CreateOrderDto, UpdateOrderStatusDto } from '../dto/order.dto';

@Controller(GHS_CONTROLLERS.ORDER.PUBLIC)
export class PublicOrderController {
  constructor(private orderService: OrderService) {}

  @Public()
  @Post()
  async submit(@Body() body: CreateOrderDto) {
    return this.orderService.create(body);
  }
}

@Controller(GHS_CONTROLLERS.ORDER.ADMIN)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get()
  async findAll(@Query() query: { status?: OrderStatus; q?: string }) {
    return this.orderService.findAll(query);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get(GHS_METHODS.COMMON.BY_ID)
  async findById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Patch(GHS_METHODS.ORDER.STATUS)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, body.status, body.internalNote, { session: null });
  }
}
