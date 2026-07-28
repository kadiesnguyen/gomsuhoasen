import { useCallback, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import { FILE_ASSET_FIELD_REFS, FILE_ASSET_MODULE_REFS } from '@gomhoasen/contracts';
import { api, apiAssetUrl } from '../services/api';
import { sanitizeRichHtml } from '../utils/rich-html';
import css from './rich-text-editor.module.css';

const FONT_SIZES = ['14px', '16px', '18px', '20px', '24px', '28px', '32px'] as const;

export interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  entityRef?: string;
  moduleRef?: string;
  fieldRef?: string;
  minHeight?: number;
}

function ToolbarButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${css.btn}${active ? ` ${css.btnActive}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active ? true : undefined}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Nhập nội dung…',
  disabled = false,
  entityRef,
  moduleRef = FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT,
  fieldRef = FILE_ASSET_FIELD_REFS.IMAGES,
  minHeight = 160,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(sanitizeRichHtml(value));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ allowBase64: false, inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: sanitizeRichHtml(value) || '',
    editable: !disabled,
    onUpdate: ({ editor: current }) => {
      const html = sanitizeRichHtml(current.getHTML());
      lastEmitted.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'ghs-rich-text-prosemirror',
        'aria-label': label,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = sanitizeRichHtml(value);
    if (next === lastEmitted.current) return;
    if (next === sanitizeRichHtml(editor.getHTML())) return;
    editor.commands.setContent(next || '', { emitUpdate: false });
    lastEmitted.current = next;
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      const asset = await api.files.uploadAsset(file, {
        moduleRef,
        fieldRef,
        entityRef,
      });
      const path = asset.storagePath;
      const src = apiAssetUrl(path) || `/${path.replace(/^\/+/, '')}`;
      editor.chain().focus().setImage({ src, alt: file.name }).run();
    },
    [editor, entityRef, fieldRef, moduleRef],
  );

  if (!editor) {
    return (
      <div>
        <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>
          {label}
        </label>
        <div className={css.wrap} style={{ minHeight }}>
          <div className={css.editor}>Đang tải trình soạn thảo…</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>
        {label}
      </label>
      <div className={css.wrap}>
        <div className={css.toolbar} role="toolbar" aria-label={`Công cụ ${label}`}>
          <div className={css.group}>
            <ToolbarButton
              label="B"
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={disabled}
            />
            <ToolbarButton
              label="I"
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={disabled}
            />
            <ToolbarButton
              label="U"
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              disabled={disabled}
            />
          </div>
          <div className={css.group}>
            <select
              className={css.select}
              aria-label="Cỡ chữ"
              disabled={disabled}
              value={String(editor.getAttributes('textStyle').fontSize || '')}
              onChange={(event) => {
                const size = event.target.value;
                if (!size) {
                  editor.chain().focus().unsetFontSize().run();
                  return;
                }
                editor.chain().focus().setFontSize(size).run();
              }}
            >
              <option value="">Cỡ chữ</option>
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <input
              className={css.color}
              type="color"
              aria-label="Màu chữ"
              disabled={disabled}
              value={editor.getAttributes('textStyle').color || '#191714'}
              onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            />
          </div>
          <div className={css.group}>
            <ToolbarButton
              label="H2"
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={disabled}
            />
            <ToolbarButton
              label="H3"
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              disabled={disabled}
            />
            <ToolbarButton
              label="• List"
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              disabled={disabled}
            />
            <ToolbarButton
              label="1. List"
              active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={disabled}
            />
          </div>
          <div className={css.group}>
            <ToolbarButton
              label="Trái"
              active={editor.isActive({ textAlign: 'left' })}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              disabled={disabled}
            />
            <ToolbarButton
              label="Giữa"
              active={editor.isActive({ textAlign: 'center' })}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              disabled={disabled}
            />
            <ToolbarButton
              label="Phải"
              active={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              disabled={disabled}
            />
          </div>
          <div className={css.group}>
            <ToolbarButton
              label="Link"
              active={editor.isActive('link')}
              onClick={() => {
                const previous = editor.getAttributes('link').href as string | undefined;
                const next = window.prompt('URL liên kết', previous || 'https://');
                if (next === null) return;
                if (!next.trim()) {
                  editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  return;
                }
                editor.chain().focus().extendMarkRange('link').setLink({ href: next.trim() }).run();
              }}
              disabled={disabled}
            />
            <ToolbarButton
              label="Ảnh"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            />
            <ToolbarButton
              label="Bảng"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              disabled={disabled}
            />
          </div>
        </div>
        <div className={css.editor} style={{ minHeight }}>
          <EditorContent editor={editor} />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            void uploadImage(file).catch((error: unknown) => {
              window.alert(error instanceof Error ? error.message : 'Upload ảnh thất bại');
            });
          }}
        />
      </div>
      <p className={css.hint}>Có thể dán từ Word/Excel. Hỗ trợ màu, cỡ chữ, bảng và chèn ảnh.</p>
    </div>
  );
}
