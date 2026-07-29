import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, QueryFilter, UpdateQuery } from 'mongoose';
import { DomainNotFoundException } from '@vt/platform-error';
import { Order, OrderDocument, OrderStatus } from '../schemas/order.schema';
import { CreateOrderDto } from '../dto/order.dto';
import { ORDER_ERRORS } from '../constants/order.constants';
import { assertOrderTransition } from '../constants/order-transitions';
import { buildInitialOrderValues } from '../constants/order-writer-initial-values';

@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

  async findAll(query: { status?: OrderStatus; q?: string }) {
    const filter: QueryFilter<OrderDocument> = {};
    if (query.status) filter.status = query.status;
    const q = query.q?.trim();
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { customerName: { $regex: escaped, $options: 'i' } },
        { customerPhone: { $regex: escaped, $options: 'i' } },
      ];
    }
    return this.orderModel.find(filter).sort({ createdAt: -1 });
  }

  async findById(id: string) {
    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new DomainNotFoundException(ORDER_ERRORS.ORDER_NOT_FOUND, 'Đơn hàng không tồn tại');
    }
    return order;
  }

  async create(data: CreateOrderDto) {
    return this.orderModel.create(buildInitialOrderValues(data));
  }

  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    internalNote: string | undefined,
    options: { session: ClientSession | null },
  ) {
    const currentQuery = this.orderModel.findById(id);
    currentQuery.session(options.session);
    const current = await currentQuery.exec();
    if (!current) {
      throw new DomainNotFoundException(ORDER_ERRORS.ORDER_NOT_FOUND, 'Đơn hàng không tồn tại');
    }

    assertOrderTransition(current.status, newStatus);

    const update: UpdateQuery<OrderDocument> = { status: newStatus };
    if (internalNote !== undefined) update.internalNote = internalNote;
    return this.orderModel.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: 'after', session: options.session },
    );
  }
}
