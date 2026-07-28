import DOMPurify from 'isomorphic-dompurify';

const RICH_HTML_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'span',
    'a',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'blockquote',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style', 'colspan', 'rowspan', 'width', 'height'],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeRichHtml(html: string): string {
  const input = String(html ?? '').trim();
  if (!input) return '';
  return String(DOMPurify.sanitize(input, RICH_HTML_CONFIG)).trim();
}

export function stripRichHtml(html: string): string {
  return sanitizeRichHtml(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isBlankRichHtml(html: string): boolean {
  const sanitized = sanitizeRichHtml(html);
  if (!sanitized) return true;
  return sanitized.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

function escapePlainText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Matches only tags this editor/sanitizer actually produces (e.g. "<p>", "<br/>"), not a
// stray "<" in plain text (e.g. Vietnamese copy like "giá < 500k"), which would otherwise be
// misdetected as HTML and passed through unescaped instead of rendered as literal text.
const KNOWN_RICH_TAG_RE = new RegExp(`<\\/?(?:${RICH_HTML_CONFIG.ALLOWED_TAGS.join('|')})(?:[\\s/>]|$)`, 'i');

/** Plain text (incl. blank-line paragraphs) → sanitized HTML; HTML sanitized for render. */
export function toRenderableRichHtml(value: string | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!KNOWN_RICH_TAG_RE.test(raw)) {
    const paragraphs = raw
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    return sanitizeRichHtml(
      paragraphs
        .map((paragraph) => `<p>${escapePlainText(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join(''),
    );
  }
  return sanitizeRichHtml(raw);
}
