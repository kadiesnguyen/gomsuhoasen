import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileController } from './controllers/file.controller';
import { FileAsset, FileAssetSchema } from './schemas/file-asset.schema';
import { GHS_FILE_STORAGE_ADAPTER_PROVIDER } from './providers/file-storage.provider';
import { FileService } from './services/file.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FileAsset.name, schema: FileAssetSchema }]),
  ],
  controllers: [FileController],
  providers: [FileService, GHS_FILE_STORAGE_ADAPTER_PROVIDER],
  exports: [FileService],
})
export class FileModule {}
