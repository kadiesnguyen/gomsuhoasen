import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Artisan, ArtisanSchema } from './schemas/artisan.schema';
import { ArtisanService } from './services/artisan.service';
import { ArtisanController } from './controllers/artisan.controller';
import { PublicArtisanController } from './controllers/public-artisan.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Artisan.name, schema: ArtisanSchema }]),
  ],
  controllers: [ArtisanController, PublicArtisanController],
  providers: [ArtisanService],
  exports: [ArtisanService],
})
export class ArtisanModule {}
