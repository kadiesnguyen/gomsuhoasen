import { Module, forwardRef } from '@nestjs/common';
import { IamModule } from '@gomhoasen/iam';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';
import { PublicCatalogController } from './controllers/public-catalog.controller';
import { ProvenanceController, PublicProvenanceController } from './controllers/provenance.controller';
import { ProvenanceRecord, ProvenanceRecordSchema } from './schemas/provenance-record.schema';
import { ProvenanceService } from './services/provenance.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProvenanceRecord.name, schema: ProvenanceRecordSchema },
    ]),
    forwardRef(() => IamModule),
  ],
  controllers: [ProductController, PublicCatalogController, ProvenanceController, PublicProvenanceController],
  providers: [ProductService, ProvenanceService],
  exports: [ProductService, ProvenanceService],
})
export class CatalogModule {}
