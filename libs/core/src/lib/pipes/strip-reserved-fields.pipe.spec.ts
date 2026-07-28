import { ArgumentMetadata } from '@nestjs/common';
import { StripReservedFieldsPipe } from './strip-reserved-fields.pipe';

const bodyMetadata: ArgumentMetadata = { type: 'body' };
const queryMetadata: ArgumentMetadata = { type: 'query' };

describe('StripReservedFieldsPipe', () => {
  it('[SEC-001] strips reserved infrastructure fields from request body', () => {
    const pipe = new StripReservedFieldsPipe();

    expect(pipe.transform({
      _id: 'spoofed',
      createdAt: 'spoofed',
      updatedAt: 'spoofed',
      isDeleted: true,
      name: 'Bình gốm',
    }, bodyMetadata)).toEqual({
      name: 'Bình gốm',
    });
  });

  it('[SEC-001] keeps non-body values unchanged', () => {
    const pipe = new StripReservedFieldsPipe();
    const query = { _id: 'filter-id', page: '1' };

    expect(pipe.transform(query, queryMetadata)).toBe(query);
  });

  it('[SEC-001] leaves arrays unchanged', () => {
    const pipe = new StripReservedFieldsPipe();
    const payload = [{ _id: 'item-1' }];

    expect(pipe.transform(payload, bodyMetadata)).toBe(payload);
  });
});

