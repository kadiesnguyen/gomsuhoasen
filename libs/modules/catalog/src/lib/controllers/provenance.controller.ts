import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { COMMON_ERROR_CODES, DomainBadRequestException } from '@vt/platform-error';
import { Public, Roles, RolesGuard } from '@gomhoasen/iam';
import { extensionGuard, PDF_EXTENSIONS, uploadStorage } from '@gomhoasen/core';
import { buildPublicUploadPath } from '@vt/platform-file-core/browser';
import { GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS } from '@gomhoasen/contracts';
import { CreateProvenanceDto, UpdateProvenanceDto } from '../dto/provenance.dto';
import { ProvenanceService } from '../services/provenance.service';

const provenanceUploadStorage = uploadStorage(
  (req) => `provenance/${Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId}`,
);

@Controller(GHS_CONTROLLERS.CATALOG.PUBLIC_PRODUCT_PROVENANCE)
export class PublicProvenanceController {
  constructor(private readonly provenanceService: ProvenanceService) {}

  @Public()
  @Get()
  async findPublic(@Param('productId') productId: string) {
    return this.provenanceService.findByProduct(productId, true);
  }
}

@Controller(GHS_CONTROLLERS.CATALOG.ADMIN_CATALOG)
@UseGuards(RolesGuard)
export class ProvenanceController {
  constructor(private readonly provenanceService: ProvenanceService) {}

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post(GHS_METHODS.CATALOG.PRODUCT_PROVENANCE)
  @UseInterceptors(FileInterceptor('file', {
    storage: provenanceUploadStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: extensionGuard(PDF_EXTENSIONS),
  }))
  async upload(
    @Param('productId') productId: string,
    @Body() dto: CreateProvenanceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new DomainBadRequestException(COMMON_ERROR_CODES.MISSING_REQUIRED_FIELD, 'Thiếu file PDF');
    const fileUrl = buildPublicUploadPath('provenance', productId, file.filename);
    return this.provenanceService.create(productId, dto, fileUrl);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get(GHS_METHODS.CATALOG.PRODUCT_PROVENANCE)
  async findAdmin(@Param('productId') productId: string) {
    return this.provenanceService.findByProduct(productId);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Patch(GHS_METHODS.CATALOG.PROVENANCE_BY_ID)
  async update(@Param('id') id: string, @Body() dto: UpdateProvenanceDto) {
    return this.provenanceService.update(id, dto);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_ONLY)
  @Delete(GHS_METHODS.CATALOG.PROVENANCE_BY_ID)
  async delete(@Param('id') id: string) {
    return this.provenanceService.softDelete(id);
  }
}
