// Refs read: v2/libs/catalog/src/lib/controllers/admin/product.controller.ts
// Kept: CRUD route pattern, swagger-ready
// Dropped: permission decorators, tenant guard

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'node:path';
import { COMMON_ERROR_CODES, DomainBadRequestException } from '@vt/platform-error';
import { ProductService } from '../services/product.service';
import { CurrentUser, Roles, RolesGuard, AuditLoggerService } from '@gomhoasen/iam';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { extensionGuard, IMAGE_EXTENSIONS, MODEL_EXTENSIONS, VIDEO_EXTENSIONS, uploadStorage } from '@gomhoasen/core';
import { buildPublicUploadPath } from '@vt/platform-file-core/browser';
import { GHS_AUDIT_ACTIONS, GHS_AUDIT_ENTITIES, GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS, type ProductStatus } from '@gomhoasen/contracts';

const productUploadStorage = (kind: 'images' | 'model' | 'video-360') =>
  uploadStorage(
    (req) => `products/${Array.isArray(req.params.id) ? req.params.id[0] : req.params.id}/${kind}`,
    kind === 'model' ? (file) => `model${extname(file.originalname).toLowerCase()}` : undefined,
  );

@Controller(GHS_CONTROLLERS.CATALOG.PRODUCT)
@UseGuards(RolesGuard)
export class ProductController {
  constructor(
    private productService: ProductService,
    private auditLogger: AuditLoggerService
  ) {}

  @Get()
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async findAll(@Query() query: { status?: ProductStatus; search?: string; collection?: string }) {
    return this.productService.findAll(query);
  }

  @Get(GHS_METHODS.COMMON.BY_ID)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async findById(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Post()
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async create(@Body() dto: CreateProductDto, @CurrentUser() user?: { userId?: string }) {
    const product = await this.productService.create(dto);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.CREATE_PRODUCT, entity: GHS_AUDIT_ENTITIES.PRODUCT, entityId: product._id.toString() });
    return product;
  }

  @Patch(GHS_METHODS.COMMON.BY_ID)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user?: { userId?: string }) {
    const product = await this.productService.update(id, dto);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.UPDATE_PRODUCT, entity: GHS_AUDIT_ENTITIES.PRODUCT, entityId: id });
    return product;
  }

  @Delete(GHS_METHODS.COMMON.BY_ID)
  @Roles(...USER_ROLE_GROUPS.ADMIN_ONLY)
  async delete(@Param('id') id: string, @CurrentUser() user?: { userId?: string }) {
    const product = await this.productService.softDelete(id);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.DELETE_PRODUCT, entity: GHS_AUDIT_ENTITIES.PRODUCT, entityId: id });
    return product;
  }

  @Post(GHS_METHODS.CATALOG.IMAGES)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @UseInterceptors(FileInterceptor('file', {
    storage: productUploadStorage('images'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: extensionGuard(IMAGE_EXTENSIONS),
  }))
  async uploadImage(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File, @CurrentUser() user?: { userId?: string }) {
    if (!file) throw new DomainBadRequestException(COMMON_ERROR_CODES.MISSING_REQUIRED_FIELD, 'Thiếu file ảnh');
    const relativePath = buildPublicUploadPath('products', id, 'images', file.filename);
    const result = await this.productService.addImage(id, relativePath);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.UPLOAD_IMAGE, entity: GHS_AUDIT_ENTITIES.PRODUCT, entityId: id, payload: { path: relativePath } });
    return result;
  }

  @Delete(GHS_METHODS.CATALOG.IMAGE_BY_NAME)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  async removeImage(@Param('id') id: string, @Param('filename') filename: string, @CurrentUser() user?: { userId?: string }) {
    const result = await this.productService.removeImage(id, buildPublicUploadPath('products', id, 'images', filename));
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.REMOVE_IMAGE, entity: GHS_AUDIT_ENTITIES.PRODUCT, entityId: id, payload: { filename } });
    return result;
  }

  @Post(GHS_METHODS.CATALOG.MODEL)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @UseInterceptors(FileInterceptor('file', {
    storage: productUploadStorage('model'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: extensionGuard(MODEL_EXTENSIONS),
  }))
  async uploadModel(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File, @CurrentUser() user?: { userId?: string }) {
    if (!file) throw new DomainBadRequestException(COMMON_ERROR_CODES.MISSING_REQUIRED_FIELD, 'Thiếu file model');
    const path = buildPublicUploadPath('products', id, 'model', file.filename);
    const result = await this.productService.setModel(id, path);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.UPLOAD_MODEL, entity: GHS_AUDIT_ENTITIES.PRODUCT, entityId: id, payload: { path } });
    return result;
  }

  @Post(GHS_METHODS.CATALOG.VIDEO_360)
  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @UseInterceptors(FileInterceptor('file', {
    storage: productUploadStorage('video-360'),
    limits: { fileSize: 120 * 1024 * 1024 },
    fileFilter: extensionGuard(VIDEO_EXTENSIONS),
  }))
  async uploadVideo360(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File, @CurrentUser() user?: { userId?: string }) {
    if (!file) throw new DomainBadRequestException(COMMON_ERROR_CODES.MISSING_REQUIRED_FIELD, 'Thiếu file video 360');
    const path = buildPublicUploadPath('products', id, 'video-360', file.filename);
    const result = await this.productService.setVideo360(id, path);
    await this.auditLogger.log({ userId: user?.userId, action: GHS_AUDIT_ACTIONS.UPLOAD_VIDEO, entity: GHS_AUDIT_ENTITIES.PRODUCT, entityId: id, payload: { path } });
    return result;
  }
}
