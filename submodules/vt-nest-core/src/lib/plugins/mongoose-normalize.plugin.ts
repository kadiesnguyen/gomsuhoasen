import { Schema } from 'mongoose';

export function mongooseNormalizePlugin(schema: Schema): void {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
  });

  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
  });
}
