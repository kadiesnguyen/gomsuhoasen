import * as React from 'react';
import { DEFAULT_UI_BADGE_VARIANT, readUiBadgeVariant, type UiBadgeVariant } from '@vt/ui-primitives';

export type BadgeVariant = UiBadgeVariant;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  variant?: BadgeVariant;
  'data-testid'?: string;
  'data-status'?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = DEFAULT_UI_BADGE_VARIANT,
  className = '',
  'data-testid': dataTestId,
  'data-status': dataStatus,
  ...props
}) => {
  const safeVariant = readUiBadgeVariant(variant);
  const styles: Record<BadgeVariant, string> = {
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200/60 ring-emerald-500/10',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60 ring-amber-500/10',
    danger: 'bg-red-50 text-red-700 border-red-200/60 ring-red-500/10',
    info: 'bg-blue-50 text-blue-700 border-blue-200/60 ring-blue-500/10',
    neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200 ring-zinc-500/10',
    outline: 'bg-transparent text-zinc-600 border-zinc-300',
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${styles[safeVariant]} ${className}`}
      data-testid={dataTestId}
      data-status={dataStatus}
      {...props}
    >
      {label}
    </span>
  );
};
