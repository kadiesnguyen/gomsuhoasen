import * as React from 'react';

export interface AttachmentRowProps {
  readonly fileName: React.ReactNode;
  readonly status: 'uploading' | 'error' | 'done';
  readonly progress?: number; // 0 to 100
  readonly error?: string;
  readonly fileUrl?: string; // used for image preview
  readonly isImage?: boolean;
  readonly sizeLabel?: React.ReactNode;
  readonly onRetry?: () => void;
  readonly onCancel?: () => void;
  readonly onDelete?: () => void;
  readonly dragHandle?: React.ReactNode;
  readonly dragProps?: Pick<React.HTMLAttributes<HTMLDivElement>, 'onDragStart' | 'onDragOver' | 'onDrop' | 'onDragEnd'>;
  readonly isDragging?: boolean;
  readonly isDropTarget?: boolean;
  readonly children?: React.ReactNode;
  readonly translations?: {
    uploading?: string;
    error?: string;
    retry?: string;
    cancel?: string;
    delete?: string;
  };
  readonly className?: string;
  readonly 'data-testid'?: string;
}

export const AttachmentRow: React.FC<AttachmentRowProps> = ({
  fileName,
  status,
  progress = 0,
  error,
  fileUrl,
  isImage,
  sizeLabel,
  onRetry,
  onCancel,
  onDelete,
  dragHandle,
  dragProps,
  isDragging,
  isDropTarget,
  children,
  translations = {},
  className = '',
  'data-testid': dataTestId,
}) => {
  const t = {
    uploading: 'Uploading...',
    error: 'Error',
    retry: 'Retry',
    cancel: 'Cancel',
    delete: 'Delete',
    ...translations,
  };

  const showRetry = status === 'error' && onRetry;
  const showCancel = status === 'uploading' && onCancel;
  const showDelete = status === 'done' && onDelete;

  return (
    <div
      {...(dragProps || {})}
      draggable={!!dragProps}
      className={`group flex items-center gap-3 rounded-md border p-3 transition-all ${
        isDragging
          ? 'border-zinc-300 bg-zinc-50 opacity-40'
          : isDropTarget
            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
            : 'border-zinc-200 bg-white'
      } ${dragProps ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
      data-testid={dataTestId}
    >
      {dragHandle && (
        <div className="shrink-0 text-zinc-400">
          {dragHandle}
        </div>
      )}

      {/* Thumbnail or Icon */}
      {isImage && fileUrl ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-zinc-50 border border-zinc-100">
          <img src={fileUrl} alt={typeof fileName === 'string' ? fileName : 'Attachment'} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-50 border border-zinc-100 text-zinc-400">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="truncate text-sm font-medium text-zinc-900" title={typeof fileName === 'string' ? fileName : undefined}>
            {fileName}
          </div>
          {sizeLabel && status === 'done' && (
            <span className="ml-2 shrink-0 text-xs text-zinc-500">{sizeLabel}</span>
          )}
        </div>

        {/* Status / Progress */}
        {status === 'error' ? (
          <p className="text-xs text-red-600 mt-1">{error || t.error}</p>
        ) : status === 'uploading' ? (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      {/* Custom Badges (Children) */}
      {children}

      {/* Actions */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {status === 'uploading' && (
          <span className="text-xs text-zinc-400">{t.uploading}</span>
        )}
        <div className="flex gap-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {showRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              {t.retry}
            </button>
          )}
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="font-medium text-zinc-500 hover:text-zinc-800 focus:outline-none"
            >
              {t.cancel}
            </button>
          )}
          {showDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="font-medium text-red-600 hover:text-red-800 focus:outline-none"
              aria-label={t.delete}
            >
              {t.delete}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
