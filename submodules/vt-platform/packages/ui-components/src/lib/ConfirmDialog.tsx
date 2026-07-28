import * as React from 'react';
import { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  'data-testid'?: string;
}

const CONFIRM_DIALOG_Z_INDEX_CLASS = 'z-[220]';

/**
 * Confirm dialog component.
 *
 * Extracted from zalominiapp portal — refactored to accept labels directly
 * instead of using react-i18next internally. Consumer should pass translated
 * strings via confirmLabel/cancelLabel.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  'data-testid': dataTestId = 'confirm-dialog',
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    if (!isOpen) return undefined;
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const icon =
    variant === 'danger' || variant === 'warning' ? (
      <AlertTriangle
        size={24}
        className={variant === 'danger' ? 'text-red-600' : 'text-amber-600'}
      />
    ) : (
      <Info size={24} className="text-blue-600" />
    );

  const bgIconClass =
    variant === 'danger'
      ? 'bg-red-100'
      : variant === 'warning'
        ? 'bg-amber-100'
        : 'bg-blue-100';

  return (
    <div
      data-testid={dataTestId}
      className={`fixed inset-0 ${CONFIRM_DIALOG_Z_INDEX_CLASS} flex items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm animate-fade-in"
        onClick={() => !isLoading && onCancel()}
      />

      {/* Dialog Panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up ring-1 ring-zinc-950/5">
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close dialog"
          data-testid={`${dataTestId}-close`}
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-md hover:bg-zinc-100 transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="flex gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${bgIconClass}`}
            >
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-zinc-900 leading-6 mb-2 pr-6">
                {title}
              </h3>
              <div className="text-sm text-zinc-500 leading-relaxed">
                {description}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-50 px-6 py-4 flex justify-end gap-3 border-t border-zinc-100">
          <Button
            data-testid={`${dataTestId}-cancel`}
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            data-testid={`${dataTestId}-confirm`}
            type="button"
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className={
              variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : ''
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
