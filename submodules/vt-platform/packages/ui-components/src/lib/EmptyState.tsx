import * as React from 'react';
import {
  DEFAULT_UI_EMPTY_STATE_ICON,
  DEFAULT_UI_EMPTY_STATE_TEST_ID,
  isUiEmptyStateAction,
  type UiEmptyStateAction,
} from '@vt/ui-primitives';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: UiEmptyStateAction;
  testId?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = DEFAULT_UI_EMPTY_STATE_ICON,
  title,
  description,
  action,
  testId = DEFAULT_UI_EMPTY_STATE_TEST_ID,
  className = '',
  ...props
}) => {
  const safeAction = isUiEmptyStateAction(action) ? action : undefined;

  return (
  <div
    data-testid={testId}
    className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}
    {...props}
  >
    <div className="text-5xl mb-4" aria-hidden="true">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-zinc-700 mb-2">
      {title}
    </h3>
    {description && (
      <p className="text-sm text-zinc-500 max-w-md mb-6">
        {description}
      </p>
    )}
    {safeAction && (
      <button
        onClick={safeAction.onClick}
        className="vt-empty-state-action px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
      >
        {safeAction.label}
      </button>
    )}
  </div>
  );
};
