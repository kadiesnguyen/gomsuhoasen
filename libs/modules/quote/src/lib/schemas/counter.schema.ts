import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'counters', timestamps: true })
export class Counter {
  @Prop({ required: true, unique: true, index: true })
  key!: string;

  @Prop({ type: Number, required: true })
  seq!: number;
}

export type CounterDocument = Counter & Document;
export const CounterSchema = SchemaFactory.createForClass(Counter);
