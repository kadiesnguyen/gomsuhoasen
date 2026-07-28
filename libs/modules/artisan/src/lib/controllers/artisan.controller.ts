import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { COMMON_ERROR_CODES, DomainBadRequestException } from '@vt/platform-error';
import { ArtisanService } from '../services/artisan.service';
import { Roles, RolesGuard } from '@gomhoasen/iam';
import { CreateArtisanDto, UpdateArtisanDto } from '../dto/artisan.dto';
import { extensionGuard, IMAGE_EXTENSIONS, uploadStorage } from '@gomhoasen/core';
import { buildPublicUploadPath } from '@vt/platform-file-core/browser';
import { GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS, type ArtisanStatus } from '@gomhoasen/contracts';

const artisanAvatarStorage = uploadStorage(
  (req) => `artisans/${Array.isArray(req.params.id) ? req.params.id[0] : req.params.id}/avatar`,
);

@Controller(GHS_CONTROLLERS.ARTISAN.ADMIN)
@UseGuards(RolesGuard)
export class ArtisanController {
  constructor(private artisanService: ArtisanService) {}

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get()
  async findAll(@Query() query: { status?: ArtisanStatus; search?: string }) {
    return this.artisanService.findAll(query);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get(GHS_METHODS.COMMON.BY_ID)
  async findById(@Param('id') id: string) {
    return this.artisanService.findById(id);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post()
  async create(@Body() dto: CreateArtisanDto) {
    return this.artisanService.create(dto);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Patch(GHS_METHODS.COMMON.BY_ID)
  async update(@Param('id') id: string, @Body() dto: UpdateArtisanDto) {
    return this.artisanService.update(id, dto);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post(GHS_METHODS.ARTISAN.AVATAR)
  @UseInterceptors(FileInterceptor('file', {
    storage: artisanAvatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: extensionGuard(IMAGE_EXTENSIONS),
  }))
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new DomainBadRequestException(COMMON_ERROR_CODES.MISSING_REQUIRED_FIELD, 'Thiếu file ảnh chân dung');
    return this.artisanService.setAvatar(id, buildPublicUploadPath('artisans', id, 'avatar', file.filename));
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_ONLY)
  @Delete(GHS_METHODS.COMMON.BY_ID)
  async delete(@Param('id') id: string) {
    return this.artisanService.softDelete(id);
  }
}
