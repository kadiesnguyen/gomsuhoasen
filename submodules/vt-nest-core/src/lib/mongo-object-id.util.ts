import { Types } from 'mongoose';

export type MongoObjectIdCandidate = string | Types.ObjectId;

export function toMongoObjectId(value: unknown): Types.ObjectId | null {
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  if (value && typeof value === 'object' && typeof (value as { toHexString?: unknown }).toHexString === 'function') {
    const hexString = (value as { toHexString: () => unknown }).toHexString();
    if (typeof hexString === 'string' && Types.ObjectId.isValid(hexString)) {
      return new Types.ObjectId(hexString);
    }
  }
  return null;
}

export function buildMongoObjectIdStorageCandidates(value: unknown): MongoObjectIdCandidate[] {
  const objectId = toMongoObjectId(value);
  if (!objectId) {
    return typeof value === 'string' && value.trim().length > 0 ? [value] : [];
  }
  return [objectId, objectId.toHexString()];
}
