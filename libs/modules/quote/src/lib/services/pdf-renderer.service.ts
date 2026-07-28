import { Injectable, Module } from '@nestjs/common';
import type { PDFOptions } from 'puppeteer';

export type PdfRenderOptions = Pick<PDFOptions, 'format' | 'printBackground' | 'margin'>;

@Injectable()
export class PdfRendererService {
  async generatePdf(html: string, options: PdfRenderOptions): Promise<Buffer> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf(options);
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

@Module({
  providers: [PdfRendererService],
  exports: [PdfRendererService],
})
export class LocalPdfRendererModule {}
