import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'categories', timestamps: true })
export class Category {
  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop()
  description?: string;

  @Prop()
  image?: string;

  @Prop({ type: Number, required: true })
  sortOrder!: number;

  @Prop({ required: true, index: true })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ slug: 1, isDeleted: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
CategorySchema.index({ name: 'text', description: 'text' });
