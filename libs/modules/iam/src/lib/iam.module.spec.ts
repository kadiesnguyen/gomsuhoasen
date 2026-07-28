import { parseJwtExpiresIn } from './iam.module';

describe('parseJwtExpiresIn', () => {
  it('normalizes configured JWT expiry text', () => {
    expect(parseJwtExpiresIn(' 15m ')).toBe('15m');
    expect(parseJwtExpiresIn('60')).toBe(60);
  });

  it('keeps the explicit module default only for missing or blank config', () => {
    expect(parseJwtExpiresIn(undefined)).toBe('7d');
    expect(parseJwtExpiresIn('   ')).toBe('7d');
  });

  it('rejects invalid JWT expiry values', () => {
    expect(() => parseJwtExpiresIn('soon')).toThrow('JWT_EXPIRY must be a number of seconds');
  });
});
