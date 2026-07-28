import * as React from 'react';
import { type ReactNode } from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCw, Plus } from 'lucide-react';
import { readUiDisplayText, resolveUiStateRendererState } from '@vt/ui-primitives';

type StateRendererIcon = (props: { className?: string; size?: number | string }) => unknown;

interface StateRendererEmptyAction {
  label: string;
  onClick: () => void;
  icon?: StateRendererIcon;
}

export interface StateRendererProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  children: ReactNode;
  errorMessage?: string;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: StateRendererIcon;
  emptyAction?: StateRendererEmptyAction;
  onRetry?: () => void;
  fullScreen?: boolean;
  customLoader?: ReactNode;
  /** Override i18n text */
  labels?: {
    loading?: string;
    errorDefault?: string;
    errorDescription?: string;
    retryButton?: string;
    emptyDefault?: string;
    emptyDescription?: string;
  };
  'data-testid'?: string;
}

const DEFAULT_LABELS = {
  loading: 'Đang tải...',
  errorDefault: 'Đã xảy ra lỗi',
  errorDescription: 'Vui lòng thử lại sau.',
  retryButton: 'Thử lại',
  emptyDefault: 'Không có dữ liệu',
  emptyDescription: 'Chưa có dữ liệu nào.',
};

/**
 * StateRenderer — unified loading/error/empty/content state component.
 *
 * Extracted from zalominiapp portal.
 * Refactored for portability: accepts `labels` prop instead of react-i18next.
 * Consumer can pass translated strings or use defaults.
 *
 * @example
 * ```tsx
 * <StateRenderer isLoading={isLoading} isError={isError} isEmpty={items.length === 0}>
 *   <ItemList items={items} />
 * </StateRenderer>
 * ```
 */
export const StateRenderer: React.FC<StateRendererProps> = ({
  isLoading,
  isError,
  isEmpty,
  children,
  errorMessage,
  emptyMessage,
  emptyDescription,
  emptyIcon: EmptyIcon = Inbox,
  emptyAction,
  onRetry,
  fullScreen = false,
  customLoader,
  labels = {},
  'data-testid': dataTestId,
}) => {
  const l = { ...DEFAULT_LABELS, ...labels };
  const state = resolveUiStateRendererState({ isLoading, isError, isEmpty });
  const containerClass = fullScreen
    ? 'flex flex-col items-center justify-center h-[calc(100vh-200px)] w-full text-zinc-500'
    : 'flex flex-col items-center justify-center p-12 text-zinc-500 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50';

  if (state === 'loading') {
    if (customLoader) return <>{customLoader}</>;
    return (
      <div className={containerClass}>
        <Loader2 className="animate-spin text-indigo-600 mb-3" size={32} />
        <p className="text-sm font-medium">{l.loading}</p>
      </div>
    );
  }

  if (state === 'error') {
    const resolvedErrorMessage = readUiDisplayText(errorMessage, l.errorDefault);
    return (
      <div className={containerClass} data-testid={dataTestId ? `${dataTestId}-error` : 'state-renderer-error'}>
        <div className="bg-red-50 p-3 rounded-full mb-3">
          <AlertCircle className="text-red-600" size={32} />
        </div>
        <p className="text-sm font-medium text-zinc-900 mb-1">{resolvedErrorMessage}</p>
        <p className="text-xs text-zinc-500 mb-4 max-w-md text-center">
          {l.errorDescription}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            data-testid={dataTestId ? `${dataTestId}-retry` : 'state-renderer-retry'}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 shadow-sm rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw size={14} /> {l.retryButton}
          </button>
        )}
      </div>
    );
  }

  if (state === 'empty') {
    const resolvedEmptyMessage = readUiDisplayText(emptyMessage, l.emptyDefault);
    const resolvedEmptyDescription = readUiDisplayText(emptyDescription, l.emptyDescription);
    const EmptyStateIcon = EmptyIcon as React.ElementType;
    const ActionIcon = (emptyAction?.icon ?? Plus) as React.ElementType;
    return (
      <div className={containerClass} data-testid={dataTestId ? `${dataTestId}-empty` : 'empty-state'}>
        <div className="bg-zinc-100 p-3 rounded-full mb-3">
          <EmptyStateIcon className="text-zinc-400" size={32} />
        </div>
        <p className="text-sm font-medium text-zinc-900">{resolvedEmptyMessage}</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm text-center">
          {resolvedEmptyDescription}
        </p>
        {emptyAction && (
          <button
            onClick={emptyAction.onClick}
            data-testid="state-renderer-empty-action"
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white shadow-sm rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <ActionIcon size={14} />
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
