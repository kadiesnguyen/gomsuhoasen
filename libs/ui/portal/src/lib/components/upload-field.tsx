import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type HTMLAttributes,
} from 'react';
import { AttachmentRow } from '@vt/ui-components';
import { Box, Copy, Expand, ExternalLink, FileCode2, FileImage, FileText, Film, GripVertical } from 'lucide-react';
import { appendUrlPathSegments, readTrimmedString } from '@vt/common-utils';
import { api, apiAssetUrl, type FileAssetApi } from '../services/api';
import { readDisplayText } from '../utils/display-normalization';
import {
  fileMatchesAccept,
  fileNameFromPath,
  mediaPathsEqual,
  normalizeMediaPath,
  readMediaPreviewKind,
  type MediaPreviewKind,
} from '../utils/media-fields';
import { MediaPickerModal } from './media-picker-modal';
import { MediaLightboxModal } from './media-lightbox-modal';
import { MediaPreviewSurface, readMediaKindLabel } from './media-preview';

interface UploadContext {
  moduleRef: string;
  entityRef?: string;
  fieldRef: string;
  autoCommit?: boolean;
}

interface UploadFieldProps {
  label: string;
  value: string[];
  accept: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMb: number;
  helperText?: string;
  disabled?: boolean;
  reorderable?: boolean;
  uploadContext?: UploadContext;
  onChange: (value: string[]) => void;
  onFilesAccepted?: (files: File[]) => void;
  onUploadFile?: (file: File) => Promise<string | string[]>;
  placeholderPath?: (file: File) => string;
}

interface UploadRow {
  id: string;
  fileName: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface LocalPreview {
  path: string;
  url: string;
}

interface UploadResult {
  paths: string[];
  assetMap?: { [path: string]: string };
}

interface MediaPreviewCardProps {
  path: string;
  previewUrl: string;
  kind: MediaPreviewKind;
  canReorder: boolean;
  copied: boolean;
  dragProps?: Pick<HTMLAttributes<HTMLDivElement>, 'onDragStart' | 'onDragOver' | 'onDrop' | 'onDragEnd'>;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onPreview: () => void;
  onChangePath: (nextPath: string) => void;
  onCopyPath: () => void;
  onDelete: () => void;
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: 10,
  fontSize: '0.86rem',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box',
};

function defaultPlaceholder(file: File) {
  return appendUrlPathSegments('uploads/pending', file.name);
}

function previewUrlForPath(path: string, localPreviews: LocalPreview[]): string {
  const normalizedPath = normalizeMediaPath(path);
  return readDisplayText(
    localPreviews.find((preview) => normalizeMediaPath(preview.path) === normalizedPath)?.url,
    apiAssetUrl(path),
  );
}

function assetIdOf(asset: FileAssetApi) {
  return readTrimmedString(asset._id) ?? readTrimmedString(asset.id);
}

function readAssetMapKey(path: string): string {
  return normalizeMediaPath(path);
}

async function uploadViaFileApi(file: File, uploadContext?: UploadContext): Promise<UploadResult> {
  const refs = uploadContext
    ? {
        moduleRef: uploadContext.moduleRef,
        entityRef: uploadContext.entityRef,
        fieldRef: uploadContext.fieldRef,
      }
    : undefined;
  const asset = await api.files.uploadAsset(file, refs);
  const createdAssetId = assetIdOf(asset);
  const autoCommit = Boolean(uploadContext?.autoCommit ?? true);
  if (autoCommit && uploadContext?.entityRef && createdAssetId) {
    await api.files.commitRefs({
      moduleRef: uploadContext.moduleRef,
      entityRef: uploadContext.entityRef,
      fieldRef: uploadContext.fieldRef,
      attachments: [{ fileId: createdAssetId }],
    });
  }
  const path = asset.storagePath;
  return {
    paths: [path],
    assetMap: createdAssetId ? { [path]: createdAssetId } : undefined,
  };
}

function normalizeUploadResult(
  raw: string | string[] | UploadResult,
  fallbackPath: string,
): UploadResult {
  if (typeof raw === 'string') return { paths: [raw] };
  if (Array.isArray(raw)) return { paths: raw };
  if (Array.isArray(raw.paths) && raw.paths.length > 0) return raw;
  return { paths: [fallbackPath] };
}

function readKindLabel(kind: MediaPreviewKind): string {
  switch (kind) {
    case 'image':
      return 'Ảnh';
    case 'video':
      return 'Video';
    case 'document':
      return 'Tài liệu';
    case 'model':
      return '3D';
    case 'html':
      return 'HTML';
    default:
      return 'Tệp';
  }
}

function readKindIcon(kind: MediaPreviewKind) {
  switch (kind) {
    case 'image':
      return FileImage;
    case 'video':
      return Film;
    case 'document':
      return FileText;
    case 'model':
      return Box;
    case 'html':
      return FileCode2;
    default:
      return FileText;
  }
}

function renderPreviewSurface(kind: MediaPreviewKind, previewUrl: string, title: string) {
  return (
    <MediaPreviewSurface
      kind={kind}
      src={previewUrl}
      title={title}
      aspectRatio="4 / 3"
      minHeight={160}
      fit="contain"
      padding={14}
      background="linear-gradient(180deg, #fbf7ef 0%, #f2e6cd 100%)"
    />
  );
}

function MediaPreviewCard({
  path,
  previewUrl,
  kind,
  canReorder,
  copied,
  dragProps,
  isDragging,
  isDropTarget,
  onPreview,
  onChangePath,
  onCopyPath,
  onDelete,
}: MediaPreviewCardProps) {
  const title = fileNameFromPath(path);
  const actionButtonStyle: CSSProperties = {
    border: '1px solid #e6dcc8',
    borderRadius: 999,
    background: '#fffaf0',
    color: '#7b5e18',
    width: 30,
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  return (
    <div
      {...(dragProps ?? {})}
      draggable={Boolean(dragProps)}
      style={{
        border: `1px solid ${isDropTarget ? '#d4b467' : '#e9dfcf'}`,
        borderRadius: 16,
        background: '#fff',
        overflow: 'hidden',
        boxShadow: isDropTarget ? '0 0 0 3px rgba(154, 117, 32, 0.12)' : '0 1px 3px rgba(25, 23, 20, 0.06)',
        opacity: isDragging ? 0.52 : 1,
        transition: 'box-shadow 0.15s ease, opacity 0.15s ease, border-color 0.15s ease',
      }}
    >
      <div style={{ display: 'grid', gridTemplateRows: 'auto auto' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #f0e8d9', background: '#fffdf8' }}>
          {renderPreviewSurface(kind, previewUrl, title)}
        </div>

        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#191714',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#7b5e18',
                    background: '#fff6dd',
                    border: '1px solid #e9d8a6',
                    padding: '3px 8px',
                    borderRadius: 999,
                  }}
                >
                  {readMediaKindLabel(kind)}
                </span>
                {canReorder && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: '#8a8178',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <GripVertical size={14} />
                    Kéo để đổi thứ tự
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onPreview}
                style={actionButtonStyle}
                title="Xem lớn"
              >
                <Expand size={15} />
              </button>
              <button
                type="button"
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                style={actionButtonStyle}
                title="Mở xem file"
              >
                <ExternalLink size={15} />
              </button>
              <button
                type="button"
                onClick={onCopyPath}
                style={actionButtonStyle}
                title={copied ? 'Đã chép đường dẫn' : 'Chép đường dẫn'}
              >
                <Copy size={15} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                style={{
                  ...actionButtonStyle,
                  color: '#b42318',
                  background: '#fff5f3',
                  borderColor: '#f3d1cc',
                }}
                title="Xóa"
              >
                ×
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#6f6658', lineHeight: 1.5, wordBreak: 'break-all' }}>
            {path}
          </div>

          <details>
            <summary style={{ cursor: 'pointer', color: '#7b5e18', fontSize: '0.78rem', fontWeight: 700 }}>
              Chỉnh đường dẫn
            </summary>
            <div style={{ marginTop: 10 }}>
              <input
                value={path}
                onChange={(event) => onChangePath(event.target.value)}
                style={fieldStyle}
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export function UploadField({
  label,
  value,
  accept,
  multiple = false,
  maxFiles = 1,
  maxSizeMb,
  helperText,
  disabled = false,
  reorderable,
  uploadContext,
  onChange,
  onFilesAccepted,
  onUploadFile,
  placeholderPath = defaultPlaceholder,
}: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [localPreviews, setLocalPreviews] = useState<LocalPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assetByPath, setAssetByPath] = useState<{ [path: string]: string }>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const canReorder = (reorderable ?? multiple) && value.length > 1 && !disabled;

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    setLocalPreviews((previous) => {
      const next = previous.filter((preview) => value.includes(preview.path));
      if (next.length === previous.length) return previous;

      const removed = previous.filter((preview) => !value.includes(preview.path));
      const removedUrls = new Set(removed.map((preview) => preview.url));
      removed.forEach((preview) => URL.revokeObjectURL(preview.url));
      previewUrlsRef.current = previewUrlsRef.current.filter((url) => !removedUrls.has(url));
      return next;
    });
  }, [value]);

  useEffect(() => {
    if (!copiedPath) return undefined;
    const timeoutId = window.setTimeout(() => setCopiedPath(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copiedPath]);

  const updateRow = (id: string, patch: Partial<UploadRow>) => {
    setRows((previous) => previous.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    setError(null);
    const files = Array.from(fileList);
    const next = multiple ? [...value] : [];
    const accepted: File[] = [];
    const availableSlots = Math.max(0, maxFiles - next.length);

    if (availableSlots === 0) {
      setError(`Đã đạt giới hạn ${maxFiles} file.`);
      return;
    }
    if (files.length > availableSlots) {
      setError(`Chỉ có thể chọn thêm ${availableSlots} file.`);
    }

    for (const file of files) {
      if (next.length >= maxFiles) break;
      if (!fileMatchesAccept(file, accept)) {
        setError(`${file.name} không đúng định dạng ${accept}`);
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`${file.name} vượt quá ${maxSizeMb}MB`);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;
    onFilesAccepted?.(accepted);

    if (!onUploadFile && !uploadContext) {
      const placeholders = accepted.map((file) => ({ file, path: placeholderPath(file) }));
      for (const item of placeholders) next.push(item.path);
      const previews = placeholders
        .filter((item) => item.file.type.startsWith('image/'))
        .map((item) => ({ path: item.path, url: URL.createObjectURL(item.file) }));
      previewUrlsRef.current.push(...previews.map((preview) => preview.url));
      setLocalPreviews((previous) => [...previous, ...previews]);
      onChange(next.slice(0, maxFiles));
      setRows((previous) => [
        ...previous,
        ...accepted.map((file) => ({
          id: `${file.name}-${Date.now()}`,
          fileName: file.name,
          status: 'done' as const,
        })),
      ]);
      return;
    }

    for (const file of accepted) {
      const rowId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setRows((previous) => [
        ...previous,
        { id: rowId, fileName: file.name, status: 'uploading' },
      ]);
      try {
        const fallbackPath = placeholderPath(file);
        const normalized = onUploadFile
          ? normalizeUploadResult(await onUploadFile(file), fallbackPath)
          : await uploadViaFileApi(file, uploadContext);

        if (multiple) {
          next.push(...normalized.paths);
        } else {
          next.splice(0, next.length, ...normalized.paths.slice(0, 1));
        }
        if (normalized.assetMap) {
          const mappedEntries = Object.fromEntries(
            Object.entries(normalized.assetMap).map(([path, assetId]) => [readAssetMapKey(path), assetId]),
          );
          setAssetByPath((previous) => ({ ...previous, ...mappedEntries }));
        }
        onChange(next.slice(0, maxFiles));
        updateRow(rowId, { status: 'done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload thất bại';
        updateRow(rowId, { status: 'error', error: message });
      }
    }
  };

  const removeValue = async (index: number) => {
    const path = value[index];
    const assetKey = readAssetMapKey(path);
    const assetId = assetByPath[assetKey];
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
    if (assetId) {
      setAssetByPath((previous) => {
        const clone = { ...previous };
        delete clone[assetKey];
        return clone;
      });
      if (uploadContext?.moduleRef && uploadContext?.fieldRef) {
        try {
          await api.files.unref({
            assetIds: [assetId],
            moduleRef: uploadContext.moduleRef,
            entityRef: uploadContext.entityRef,
            fieldRef: uploadContext.fieldRef,
          });
        } catch {
          setError('Đã bỏ file khỏi biểu mẫu nhưng chưa thể đồng bộ tham chiếu trên máy chủ.');
        }
      }
    }
  };

  const moveValue = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const handleReorderDragStart = (idx: number) => (event: DragEvent<HTMLDivElement>) => {
    if (!canReorder) return;
    event.dataTransfer.effectAllowed = 'move';
    setDragIdx(idx);
  };

  const handleReorderDragOver = (idx: number) => (event: DragEvent<HTMLDivElement>) => {
    if (!canReorder) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropIdx(idx);
  };

  const handleReorderDrop = (idx: number) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragIdx !== null) moveValue(dragIdx, idx);
    setDragIdx(null);
    setDropIdx(null);
  };

  const clearDragState = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#555',
          marginBottom: 6,
        }}
      >
        {label}
      </label>

      <MediaPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode={multiple ? 'multiple' : 'single'}
        accept={accept}
        onSelect={async (assets) => {
          const next = multiple ? [...value] : [];
          const selectedAssetMap: { [path: string]: string } = {};

          for (const asset of assets) {
            if (next.length >= maxFiles) break;
            if (!next.some((currentPath) => mediaPathsEqual(currentPath, asset.storagePath))) {
              next.push(asset.storagePath);
            }
            const selectedAssetId = assetIdOf(asset);
            if (selectedAssetId) {
              selectedAssetMap[readAssetMapKey(asset.storagePath)] = selectedAssetId;
            }
          }

          if (!multiple) {
            next.splice(0, next.length, ...assets.map((asset) => asset.storagePath).slice(0, 1));
          }

          setAssetByPath((previous) => ({ ...previous, ...selectedAssetMap }));
          if (uploadContext?.entityRef && Object.keys(selectedAssetMap).length > 0) {
            try {
              await api.files.commitRefs({
                moduleRef: uploadContext.moduleRef,
                entityRef: uploadContext.entityRef,
                fieldRef: uploadContext.fieldRef,
                attachments: Object.values(selectedAssetMap).map((fileId) => ({ fileId })),
              });
            } catch {
              setError('Đã chọn file nhưng chưa thể đồng bộ tham chiếu trên máy chủ.');
            }
          }
          onChange(next.slice(0, maxFiles));
        }}
      />
      <MediaLightboxModal
        isOpen={previewPath !== null}
        kind={readMediaPreviewKind(previewPath ?? '', { accept })}
        src={previewPath ? previewUrlForPath(previewPath, localPreviews) : undefined}
        title={previewPath ? fileNameFromPath(previewPath) : ''}
        subtitle={previewPath ?? undefined}
        onClose={() => setPreviewPath(null)}
        onOpenExternal={
          previewPath
            ? () => window.open(previewUrlForPath(previewPath, localPreviews), '_blank', 'noopener,noreferrer')
            : undefined
        }
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void handleFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          inputRef.current?.click();
        }}
        style={{
          border: `1px dashed ${dragOver ? '#9A7520' : '#c8b06a'}`,
          borderRadius: 12,
          padding: 14,
          background: dragOver ? '#fff8e6' : '#fffdf7',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.65 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.currentTarget.value = '';
          }}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#7a5a14' }}>
          Chọn file, kéo thả, hoặc{' '}
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              setPickerOpen(true);
            }}
            style={{
              border: 0,
              padding: 0,
              background: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textDecoration: 'underline',
              color: '#9A7520',
              font: 'inherit',
              fontWeight: 'inherit',
            }}
          >
            chọn từ thư viện
          </button>
        </div>
        <div style={{ fontSize: '0.76rem', color: '#8a8178', marginTop: 4 }}>
          {readDisplayText(helperText, `${accept} · tối đa ${maxSizeMb}MB/file`)}
        </div>
      </div>

      {(error || rows.length > 0) && (
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {error && <div style={{ color: '#b91c1c', fontSize: '0.78rem' }}>{error}</div>}
          {rows.map((row) => (
            <AttachmentRow
              key={row.id}
              fileName={row.fileName}
              status={row.status === 'uploading' ? 'uploading' : row.status === 'done' ? 'done' : 'error'}
              error={row.error}
              progress={100}
              translations={{
                uploading: 'Đang tải...',
                error: 'Lỗi',
              }}
            />
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div
          style={{
            display: 'grid',
            gap: 12,
            marginTop: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {value.map((path, idx) => (
            <MediaPreviewCard
              key={`${path}-${idx}`}
              path={path}
              previewUrl={previewUrlForPath(path, localPreviews)}
              kind={readMediaPreviewKind(path, { accept })}
              canReorder={canReorder}
              copied={copiedPath === path}
              dragProps={
                canReorder
                  ? {
                      onDragStart: handleReorderDragStart(idx),
                      onDragOver: handleReorderDragOver(idx),
                      onDrop: handleReorderDrop(idx),
                      onDragEnd: clearDragState,
                    }
                  : undefined
              }
              isDragging={dragIdx === idx}
              isDropTarget={dropIdx === idx && dragIdx !== idx}
              onPreview={() => setPreviewPath(path)}
              onChangePath={(nextPath) => {
                const next = [...value];
                next[idx] = nextPath;
                onChange(next);
              }}
              onCopyPath={async () => {
                try {
                  await navigator.clipboard.writeText(path);
                  setCopiedPath(path);
                } catch {
                  setError('Không thể chép đường dẫn vào clipboard trên trình duyệt này.');
                }
              }}
              onDelete={() => {
                void removeValue(idx);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
