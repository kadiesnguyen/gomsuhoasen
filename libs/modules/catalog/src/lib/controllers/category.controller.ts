import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '@gomhoasen/iam';
import { GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS } from '@gomhoasen/contracts';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { CategoryService } from '../services/category.service';

@Controller(GHS_CONTROLLERS.CATALOG.CATEGORY)
@UseGuards(RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async findAll(@Query() query: { search?: string }) {
    return this.categoryService.findAll(query);
  }

  @Get(GHS_METHODS.COMMON.BY_ID)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async findById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Post()
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(GHS_METHODS.COMMON.BY_ID)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(GHS_METHODS.COMMON.BY_ID)
  @Roles(...USER_ROLE_GROUPS.ADMIN_ONLY)
  async delete(@Param('id') id: string) {
    return this.categoryService.softDelete(id);
  }
}
