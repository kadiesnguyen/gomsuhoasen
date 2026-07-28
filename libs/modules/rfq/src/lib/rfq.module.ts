import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rfq, RfqSchema } from './schemas/rfq.schema';
import { RfqService } from './services/rfq.service';
import { RfqController, PublicRfqController } from './controllers/rfq.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rfq.name, schema: RfqSchema }]),
  ],
  controllers: [RfqController, PublicRfqController],
  providers: [RfqService],
  exports: [RfqService],
})
export class RfqModule {}
