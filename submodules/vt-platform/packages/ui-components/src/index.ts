/**
 * @vt/ui-components — Shared React UI components for VT portal applications.
 *
 * These components are extracted from zalominiapp v2-portal.
 * They use Tailwind CSS classes and @vt/ui-primitives for type-safe variants.
 *
 * Only includes components with zero or minimal external dependencies.
 * Portal-specific components (Table with i18n, NumericDisplay with locale)
 * remain in the consuming application.
 *
 * @example
 * ```tsx
 * import { Button, Badge, Spinner, Tooltip, EmptyState, StateRenderer } from '.';
 * ```
 */

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './lib/Button';
export { Badge, type BadgeProps, type BadgeVariant } from './lib/Badge';
export { DEFAULT_UI_BADGE_VARIANT as DEFAULT_BADGE_VARIANT } from '@vt/ui-primitives';
export { Spinner, PageLoader, type SpinnerProps, type PageLoaderProps } from './lib/Spinner';
export { Tooltip, type TooltipProps } from './lib/Tooltip';
export {
  useToastController,
  type ToastController,
  type ToastControllerOptions,
  type ToastDismissScheduler,
} from './lib/Toast';
export { EmptyState, type EmptyStateProps } from './lib/EmptyState';
export { ConfirmDialog, type ConfirmDialogProps } from './lib/ConfirmDialog';
export { StateRenderer, type StateRendererProps } from './lib/StateRenderer';
export { PanelShell, type PanelShellProps } from './lib/PanelShell';
export {
  Table,
  type Column,
  type RowDataAttrs,
  type TableLabels,
  type TableProps,
  type TableTestIds,
} from './lib/Table';
export {
  Input,
  Textarea,
  Select,
  type InputProps,
  type TextareaProps,
  type SelectOption,
  type SelectProps,
} from './lib/Form';
export { Sheet, type SheetProps } from './lib/Sheet';
export { Tabs, type TabsProps, type TabItem } from './lib/Tabs';
export { AttachmentRow, type AttachmentRowProps } from './lib/AttachmentRow';
export {
  useConfirmController,
  type ConfirmControllerOptions,
  type ConfirmControllerRequest,
  type ConfirmControllerState,
  type ConfirmDialogVariant,
} from './lib/useConfirmController';
