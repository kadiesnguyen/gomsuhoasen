import { createShowroomV2DefaultContent } from '@gomhoasen/contracts';
import { createShowroomV2SitemapXml } from './showroom-v2-sitemap';

describe('createShowroomV2SitemapXml', () => {
  it('includes news, product and artisan detail routes', () => {
    const xml = createShowroomV2SitemapXml(
      createShowroomV2DefaultContent(),
      [{ slug: 'binh-hoa-sen', updatedAt: new Date('2026-07-20T10:00:00Z') }],
      [{ slug: 'le-minh-triet', updatedAt: '2026-07-21T10:00:00Z' }],
    );

    expect(xml).toContain('<loc>https://gomhoasen.vn/tin-tuc/trien-lam-di-san-gom-viet</loc>');
    expect(xml).toContain('<loc>https://gomhoasen.vn/san-pham/binh-hoa-sen</loc>');
    expect(xml).toContain('<loc>https://gomhoasen.vn/nghe-nhan/le-minh-triet</loc>');
    expect(xml).toContain('<lastmod>2026-07-20T10:00:00.000Z</lastmod>');
  });

  it('deduplicates paths and escapes URL values', () => {
    const defaults = createShowroomV2DefaultContent();
    defaults.newsLanding.newsCards = [
      { ...defaults.newsLanding.newsCards[0], slug: 'men-&-lua' },
      { ...defaults.newsLanding.newsCards[1], slug: 'men-&-lua' },
    ];

    const xml = createShowroomV2SitemapXml(defaults, [], []);

    expect(xml.match(/tin-tuc\/men-%26-lua/g)).toHaveLength(1);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
  });
});
