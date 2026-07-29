import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrderService } from './services/order.service';
import { OrderController, PublicOrderController } from './controllers/order.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrderController, PublicOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
