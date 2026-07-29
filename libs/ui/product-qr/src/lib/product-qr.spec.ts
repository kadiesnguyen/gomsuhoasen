import { describe, expect, it } from 'vitest';
import { productPublicPath, productPublicUrl, resolveProductSiteOrigin } from './product-qr';

describe('product-qr helpers', () => {
  it('builds public product path from slug', () => {
    expect(productPublicPath(' lu-huong ')).toBe('/san-pham/lu-huong');
    expect(productPublicPath('')).toBe('');
  });

  it('joins site origin without trailing slash duplication', () => {
    expect(productPublicUrl('bo-tho', 'https://gomhoasen.vn/')).toBe(
      'https://gomhoasen.vn/san-pham/bo-tho',
    );
  });

  it('prefers explicit env origin', () => {
    expect(resolveProductSiteOrigin(' http://127.0.0.1:4313/ ')).toBe('http://127.0.0.1:4313');
  });
});
