import { toRenderableRichHtml } from '@gomhoasen/ui-showroom';

type RichHtmlTag = 'div' | 'p' | 'span';

export function RichHtml({
  value,
  className,
  as: Tag = 'div',
}: {
  value?: string | null;
  className?: string;
  as?: RichHtmlTag;
}) {
  const html = toRenderableRichHtml(value ?? undefined);
  if (!html) return null;
  const classes = className ? `${className} rich-html` : 'rich-html';
  return <Tag className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}
