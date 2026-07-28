import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

type MutableRequestBody = {
  [key: string]: string | number | boolean | null | MutableRequestBody | MutableRequestBody[] | string[] | number[] | boolean[];
};

@Injectable()
export class StripReservedFieldsPipe implements PipeTransform {
  private readonly reservedFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
    'createdById',
    'updatedById',
    'deletedById',
    'isDeleted',
    '_id',
    '__v',
  ];

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !isMutableRequestBody(value)) {
      return value;
    }

    const filtered: MutableRequestBody = { ...value };
    for (const field of this.reservedFields) {
      delete filtered[field];
    }
    return filtered;
  }
}

function isMutableRequestBody(value: unknown): value is MutableRequestBody {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
