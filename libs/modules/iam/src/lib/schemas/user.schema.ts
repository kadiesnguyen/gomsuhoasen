// Refs read:
//   - v2/libs/modules/iam/src/lib/schemas/user.schema.ts
// Kept: fullName, email, hashedPassword, status, timestamps, soft-delete, unique index
// Dropped: tenantId, TOTP/MFA, avatarFileId, isSystemAdmin, department/workgroup
// Adapted: primaryEmail → email, added 'role' enum (ADMIN|EDITOR) for GHS

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  USER_ROLES,
  USER_ROLE_VALUES,
  USER_STATUSES,
  USER_STATUS_VALUES,
  type UserRole as ContractUserRole,
  type UserStatus as ContractUserStatus,
} from '@gomhoasen/contracts';

export const UserRole = USER_ROLES;
export type UserRole = ContractUserRole;

export const UserStatus = USER_STATUSES;
export type UserStatus = ContractUserStatus;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true })
  fullName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ select: false })
  hashedPassword?: string;

  @Prop({ type: String, enum: USER_ROLE_VALUES, required: true })
  role!: UserRole;

  @Prop({ type: String, enum: USER_STATUS_VALUES, required: true })
  status!: UserStatus;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ required: true, index: true })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { email: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
