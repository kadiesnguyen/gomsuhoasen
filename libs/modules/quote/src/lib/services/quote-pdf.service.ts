import { Injectable } from '@nestjs/common';
import { uploadRoot } from '@gomhoasen/core';
import { buildPublicUploadPath } from '@vt/platform-file-core/browser';
import { SiteConfigService } from '@gomhoasen/site';
import { QuoteDocument } from '../schemas/quote.schema';
import { formatVnd as money, type SiteConfigContract } from '@gomhoasen/contracts';
import { DomainException, QUOTE_ERROR_CODES } from '@vt/platform-error';
import { LocalFileStorageAdapter } from '@vt/platform-file-storage-local';
import { readTrimmedString } from '@vt/common-utils';
import { PdfRendererService } from './pdf-renderer.service';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DEFAULT_QUOTE_PDF_BRAND_NAME = 'GỐM HOA SEN';
const DEFAULT_QUOTE_PDF_TAGLINE = 'Gốm sứ nghệ thuật Việt Nam';

function readQuotePdfDisplayText(value: unknown, fallback: string): string {
  return readTrimmedString(value) ?? fallback;
}

function readQuotePdfOptionalText(value: unknown): string {
  const normalized = readTrimmedString(value);
  return normalized === undefined ? '' : normalized;
}

function escapeOptionalHtml(value: unknown): string {
  return escapeHtml(readQuotePdfOptionalText(value));
}

@Injectable()
export class QuotePdfService {
  private readonly localStorage = new LocalFileStorageAdapter({ rootDir: uploadRoot() });

  constructor(
    private readonly siteConfig: SiteConfigService,
    private readonly pdfRenderer: PdfRendererService,
  ) {}

  async generate(quote: QuoteDocument) {
    const filename = `${String(quote._id)}.pdf`;
    const storageKey = `quotes/${filename}`;
    
    const config = await this.siteConfig.getConfig();
    const html = this.renderHtml(quote, config);

    try {
      const pdf = await this.pdfRenderer.generatePdf(html, {
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' },
      });
      await this.localStorage.writeObject(storageKey, pdf);
    } catch {
      await this.localStorage.writeObject(
        storageKey.replace(/\.pdf$/, '.html'),
        Buffer.from(html, 'utf8'),
      );
      throw new DomainException(QUOTE_ERROR_CODES.QUOTE_PDF_GENERATION_FAILED, 'Không tạo được PDF. HTML fallback đã được ghi để debug.', 500);
    }

    return buildPublicUploadPath(storageKey);
  }

  private renderHtml(quote: QuoteDocument, siteConfig: SiteConfigContract) {
    const brandName = readQuotePdfDisplayText(siteConfig.brandName, DEFAULT_QUOTE_PDF_BRAND_NAME);
    const tagLine = readQuotePdfDisplayText(siteConfig.tagline, DEFAULT_QUOTE_PDF_TAGLINE);
    const email = readQuotePdfOptionalText(siteConfig.contact?.email);

    const rows = quote.items.map(item => `
      <tr>
        <td>${escapeHtml(item.productName)}<br><small>${escapeOptionalHtml(item.glaze)} ${escapeOptionalHtml(item.size)}</small></td>
        <td>${escapeOptionalHtml(item.customization)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${money(item.unitPrice)}</td>
        <td class="num">${money(item.lineTotal)}</td>
      </tr>
    `).join('');

    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #191714; margin: 0; }
    .brand { color: #9A7520; font-weight: 800; letter-spacing: 0.14em; font-size: 18px; }
    .muted { color: #7A7570; }
    h1 { font-size: 28px; margin: 28px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { background: #f7f4ec; color: #5f554c; font-size: 12px; text-align: left; padding: 10px; }
    td { border-bottom: 1px solid #eee6d8; padding: 12px 10px; vertical-align: top; }
    small { color: #7A7570; }
    .num { text-align: right; white-space: nowrap; }
    .total { margin-top: 18px; margin-left: auto; width: 280px; }
    .total div { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand { font-weight: 800; color: #9A7520; font-size: 18px; border-top: 1px solid #d8c990; }
    .terms { margin-top: 30px; padding: 14px; background: #fffaf0; border: 1px solid #eadfbf; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="brand">${escapeHtml(brandName)}</div>
  <div class="muted">${escapeHtml(tagLine)}</div>
  <h1>Báo giá ${escapeHtml(quote.code)}</h1>
  <div>Khách hàng: <strong>${escapeOptionalHtml(quote.customerName)}</strong></div>
  <div>Điện thoại: ${escapeOptionalHtml(quote.customerPhone)} · Email: ${escapeHtml(readQuotePdfDisplayText(quote.customerEmail, email))}</div>
  <div>Hiệu lực đến: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('vi-VN') : 'Theo thỏa thuận'}</div>
  <table>
    <thead><tr><th>Sản phẩm</th><th>Tùy chỉnh</th><th class="num">SL</th><th class="num">Đơn giá</th><th class="num">Thành tiền</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">
    <div><span>Tạm tính</span><strong>${money(quote.subtotal)}</strong></div>
    <div><span>Chiết khấu</span><strong>${money(quote.discount)}</strong></div>
    <div class="grand"><span>Tổng cộng</span><span>${money(quote.total)}</span></div>
  </div>
  <div class="terms"><strong>Điều khoản:</strong><br>${escapeOptionalHtml(quote.terms)}</div>
</body>
</html>`;
  }
}
