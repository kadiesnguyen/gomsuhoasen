import { Module, forwardRef } from '@nestjs/common';
import { IamModule } from '@gomhoasen/iam';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteConfigController } from './controllers/site-config.controller';
import { SiteConfig, SiteConfigSchema } from './schemas/site-config.schema';
import { SiteConfigService } from './services/site-config.service';
import { ShowroomV2ContentController } from './controllers/showroom-v2-content.controller';
import { ShowroomV2Content, ShowroomV2ContentSchema } from './schemas/showroom-v2-content.schema';
import { ShowroomV2ContentService } from './services/showroom-v2-content.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteConfig.name, schema: SiteConfigSchema },
      { name: ShowroomV2Content.name, schema: ShowroomV2ContentSchema },
    ]),
    forwardRef(() => IamModule),
  ],
  controllers: [SiteConfigController, ShowroomV2ContentController],
  providers: [SiteConfigService, ShowroomV2ContentService],
  exports: [SiteConfigService, ShowroomV2ContentService],
})
export class SiteModule {}
