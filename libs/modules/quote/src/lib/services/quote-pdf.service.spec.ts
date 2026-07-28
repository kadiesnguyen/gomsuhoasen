process.env['GHS_APPLICATION_SCOPE_ID'] = process.env['GHS_APPLICATION_SCOPE_ID'] ?? 'ghs-test-scope';

import { QuotePdfService } from './quote-pdf.service';

describe('QuotePdfService', () => {
  it('trims optional display text before rendering quote HTML', () => {
    const service = Object.create(QuotePdfService.prototype) as {
      renderHtml(quote: unknown, siteConfig: unknown): string;
    };

    const html = service.renderHtml(
      {
        code: 'Q-001',
        customerName: 'Buyer',
        customerPhone: '0900000000',
        customerEmail: '   ',
        validUntil: null,
        subtotal: 100000,
        discount: 0,
        total: 100000,
        terms: '   ',
        items: [{
          productName: 'Tea cup',
          glaze: '  White  ',
          size: '  M  ',
          customization: '  Handle  ',
          quantity: 1,
          unitPrice: 100000,
          lineTotal: 100000,
        }],
      },
      {
        brandName: '  Brand  ',
        tagline: '  Tagline  ',
        contact: { email: ' contact@example.com ' },
      },
    );

    expect(html).toContain('<div class="brand">Brand</div>');
    expect(html).toContain('<div class="muted">Tagline</div>');
    expect(html).toContain('Email: contact@example.com');
    expect(html).toContain('White M');
    expect(html).toContain('<td>Handle</td>');
    expect(html).not.toContain('  Brand  ');
    expect(html).not.toContain('  Tagline  ');
    expect(html).not.toContain('  White  ');
    expect(html).not.toContain('  Handle  ');
    expect(html).not.toContain(' contact@example.com ');
  });

  it('uses default brand text only when PDF display fields are blank', () => {
    const service = Object.create(QuotePdfService.prototype) as {
      renderHtml(quote: unknown, siteConfig: unknown): string;
    };

    const html = service.renderHtml(
      {
        code: 'Q-001',
        customerName: 'Buyer',
        customerPhone: '0900000000',
        customerEmail: undefined,
        validUntil: null,
        subtotal: 0,
        discount: 0,
        total: 0,
        terms: undefined,
        items: [],
      },
      {
        brandName: '   ',
        tagline: '',
        contact: {},
      },
    );

    expect(html).toContain('<div class="brand">GỐM HOA SEN</div>');
    expect(html).toContain('<div class="muted">Gốm sứ nghệ thuật Việt Nam</div>');
  });
});
