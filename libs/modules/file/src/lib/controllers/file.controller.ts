import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  DomainBadRequestException,
} from '@vt/platform-error';
import { CurrentUser, Roles } from '@gomhoasen/iam';
import { uploadStorage } from '@gomhoasen/core';
import {
  buildFileContentResponseHeaders,
  buildPublicUploadPath,
  publicUploadPathToStorageKey,
} from '@vt/platform-file-core/browser';
import { GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS } from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';
import { CommitRefsDto, CreateAssetMetadataDto, ListFileAssetsQueryDto, UnrefDto } from '../dto/file.dto';
import { FileService } from '../services/file.service';
import { GHS_FILE_STORAGE_ADAPTER, type GhsFileStorageAdapter } from '../providers/file-storage.provider';

interface FileCurrentUser {
  id?: string;
  _id?: string;
  email?: string;
}

function readUploadedBy(user?: FileCurrentUser): string | undefined {
  return readTrimmedString(user?.id) ?? readTrimmedString(user?._id) ?? readTrimmedString(user?.email);
}

@Controller(GHS_CONTROLLERS.FILE.MAIN)
export class FileController {
  constructor(
    private readonly fileService: FileService,
    @Inject(GHS_FILE_STORAGE_ADAPTER) private readonly localStorage: GhsFileStorageAdapter,
  ) {}

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post(GHS_METHODS.FILE.ASSETS)
  @UseInterceptors(FileInterceptor('file', {
    storage: uploadStorage(() => 'files/raw'),
  }))
  async uploadAsset(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 120 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
    @Body() body: CreateAssetMetadataDto,
    @CurrentUser() user?: FileCurrentUser,
  ) {
    const storagePath = buildPublicUploadPath('files', 'raw', file.filename);
    const uploadedBy = readUploadedBy(user);
    return this.fileService.createAsset({
      file,
      storagePath,
      uploadedBy,
      moduleRef: body.moduleRef,
      entityRef: body.entityRef,
      fieldRef: body.fieldRef,
      metadata: body.metadata,
    });
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get(GHS_METHODS.FILE.ASSETS)
  async listAssets(@Query() query: ListFileAssetsQueryDto) {
    return this.fileService.listAssets(query);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post(GHS_METHODS.FILE.COMMIT_REFS)
  async commitRefs(@Body() body: CommitRefsDto) {
    return this.fileService.commitRefs(body);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Post(GHS_METHODS.FILE.UNREF)
  async unref(@Body() body: UnrefDto) {
    return this.fileService.unref(body);
  }

  @Roles(...USER_ROLE_GROUPS.ADMIN_EDITOR)
  @Get(GHS_METHODS.FILE.ASSET_CONTENT)
  async getContent(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.fileService.findById(id);
    const storageKey = publicUploadPathToStorageKey(asset.storagePath);

    if (!(await this.localStorage.exists(storageKey))) {
      throw new DomainBadRequestException('FILE_MISSING_ON_DISK', 'Không tìm thấy file trên hệ thống');
    }

    const headers = buildFileContentResponseHeaders({
      fileName: asset.originalName,
      mimeType: asset.mimeType,
    });
    res.setHeader('Content-Type', headers.contentType);
    res.setHeader('Content-Disposition', headers.contentDisposition);
    this.localStorage.createReadStream(storageKey).pipe(res);
  }
}
