import { buildPaginationMeta, parseOffsetPaginationQuery, parsePaginationQuery } from './pagination.util';

describe('pagination utilities', () => {
  it('[SEC-002] falls back when page and limit are NaN', () => {
    expect(parsePaginationQuery({ page: 'abc', limit: 'bad' })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
      sort: { createdAt: -1 },
    });
  });

  it('[SEC-002] falls back when page and limit are not finite', () => {
    expect(parsePaginationQuery({ page: 'Infinity', limit: Number.POSITIVE_INFINITY })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
      sort: { createdAt: -1 },
    });
  });

  it('[SEC-002] clamps oversized limit to 100', () => {
    expect(parsePaginationQuery({ page: 3, limit: 9999 })).toEqual({
      page: 3,
      limit: 100,
      skip: 200,
      sort: { createdAt: -1 },
    });
  });

  it('[FIL-004] builds stable pagination metadata', () => {
    expect(buildPaginationMeta(0, 1, 20)).toEqual({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    expect(buildPaginationMeta(41, 2, 20)).toEqual({
      total: 41,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });

  it('[SEC-002] normalizes offset pagination without page semantics', () => {
    expect(parseOffsetPaginationQuery({ offset: 'abc', limit: Number.POSITIVE_INFINITY })).toEqual({
      offset: 0,
      skip: 0,
      limit: 20,
    });
    expect(parseOffsetPaginationQuery({ skip: 15, limit: 9999 })).toEqual({
      offset: 15,
      skip: 15,
      limit: 100,
    });
  });
});

