export const UI_DENSITIES = ['public', 'commerce', 'community', 'operational'] as const;

export type UiDensity = (typeof UI_DENSITIES)[number];

export const DEFAULT_UI_DENSITY: UiDensity = 'public';

const UI_DENSITY_SET = new Set<string>(UI_DENSITIES);

export function isUiDensity(value: unknown): value is UiDensity {
  return typeof value === 'string' && UI_DENSITY_SET.has(value);
}

export function readUiDensity(
  value: unknown,
  fallback: UiDensity = DEFAULT_UI_DENSITY,
): UiDensity {
  return isUiDensity(value) ? value : fallback;
}

export const MIN_UI_PROGRESS_PERCENT = 0;
export const MAX_UI_PROGRESS_PERCENT = 100;
export const DEFAULT_UI_PROGRESS_PERCENT = MIN_UI_PROGRESS_PERCENT;

export function readUiTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function readUiDisplayText(value: unknown, fallback: string): string {
  return readUiTrimmedString(value) ?? fallback;
}

export function readUiProgressPercent(
  value: unknown,
  fallback: number = DEFAULT_UI_PROGRESS_PERCENT,
): number {
  const candidate = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const finiteCandidate = Number.isFinite(candidate) ? candidate : DEFAULT_UI_PROGRESS_PERCENT;
  return Math.min(MAX_UI_PROGRESS_PERCENT, Math.max(MIN_UI_PROGRESS_PERCENT, finiteCandidate));
}

export const UI_BADGE_VARIANTS = [
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
  'outline',
] as const;

export type UiBadgeVariant = (typeof UI_BADGE_VARIANTS)[number];

export const DEFAULT_UI_BADGE_VARIANT: UiBadgeVariant = 'neutral';

const UI_BADGE_VARIANT_SET = new Set<string>(UI_BADGE_VARIANTS);

export function isUiBadgeVariant(value: unknown): value is UiBadgeVariant {
  return typeof value === 'string' && UI_BADGE_VARIANT_SET.has(value);
}

export function readUiBadgeVariant(
  value: unknown,
  fallback: UiBadgeVariant = DEFAULT_UI_BADGE_VARIANT,
): UiBadgeVariant {
  return isUiBadgeVariant(value) ? value : fallback;
}

export const UI_BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'destructive',
  'ghost',
  'outline',
  'link',
] as const;

export type UiButtonVariant = (typeof UI_BUTTON_VARIANTS)[number];

export const DEFAULT_UI_BUTTON_VARIANT: UiButtonVariant = 'primary';

const UI_BUTTON_VARIANT_SET = new Set<string>(UI_BUTTON_VARIANTS);

export function isUiButtonVariant(value: unknown): value is UiButtonVariant {
  return typeof value === 'string' && UI_BUTTON_VARIANT_SET.has(value);
}

export function readUiButtonVariant(
  value: unknown,
  fallback: UiButtonVariant = DEFAULT_UI_BUTTON_VARIANT,
): UiButtonVariant {
  return isUiButtonVariant(value) ? value : fallback;
}

export const UI_BUTTON_SIZES = ['xs', 'sm', 'md', 'lg', 'icon'] as const;

export type UiButtonSize = (typeof UI_BUTTON_SIZES)[number];

export const DEFAULT_UI_BUTTON_SIZE: UiButtonSize = 'md';

const UI_BUTTON_SIZE_SET = new Set<string>(UI_BUTTON_SIZES);

export function isUiButtonSize(value: unknown): value is UiButtonSize {
  return typeof value === 'string' && UI_BUTTON_SIZE_SET.has(value);
}

export function readUiButtonSize(
  value: unknown,
  fallback: UiButtonSize = DEFAULT_UI_BUTTON_SIZE,
): UiButtonSize {
  return isUiButtonSize(value) ? value : fallback;
}

export const UI_SPINNER_SIZES = ['sm', 'md', 'lg', 'xl'] as const;

export type UiSpinnerSize = (typeof UI_SPINNER_SIZES)[number];

export const DEFAULT_UI_SPINNER_SIZE: UiSpinnerSize = 'md';
export const DEFAULT_UI_PAGE_LOADER_SIZE: UiSpinnerSize = 'lg';

const UI_SPINNER_SIZE_SET = new Set<string>(UI_SPINNER_SIZES);

export function isUiSpinnerSize(value: unknown): value is UiSpinnerSize {
  return typeof value === 'string' && UI_SPINNER_SIZE_SET.has(value);
}

export function readUiSpinnerSize(
  value: unknown,
  fallback: UiSpinnerSize = DEFAULT_UI_SPINNER_SIZE,
): UiSpinnerSize {
  return isUiSpinnerSize(value) ? value : fallback;
}

export const UI_SPINNER_TONES = ['primary', 'muted', 'inverse'] as const;

export type UiSpinnerTone = (typeof UI_SPINNER_TONES)[number];

export const DEFAULT_UI_SPINNER_TONE: UiSpinnerTone = 'primary';
export const DEFAULT_UI_PAGE_LOADER_TONE: UiSpinnerTone = 'muted';

const UI_SPINNER_TONE_SET = new Set<string>(UI_SPINNER_TONES);

export function isUiSpinnerTone(value: unknown): value is UiSpinnerTone {
  return typeof value === 'string' && UI_SPINNER_TONE_SET.has(value);
}

export function readUiSpinnerTone(
  value: unknown,
  fallback: UiSpinnerTone = DEFAULT_UI_SPINNER_TONE,
): UiSpinnerTone {
  return isUiSpinnerTone(value) ? value : fallback;
}

export const DEFAULT_UI_EMPTY_STATE_ICON = '\u{1F4ED}';
export const DEFAULT_UI_EMPTY_STATE_TEST_ID = 'empty-state';

export interface UiEmptyStateAction {
  label: string;
  onClick: () => void;
}

export function isUiEmptyStateAction(value: unknown): value is UiEmptyStateAction {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    readUiTrimmedString(candidate.label) !== undefined &&
    typeof candidate.onClick === 'function'
  );
}

export function readUiEmptyStateAction(value: unknown): UiEmptyStateAction | undefined {
  return isUiEmptyStateAction(value) ? value : undefined;
}

export const UI_TABLE_ALIGNS = ['left', 'center', 'right'] as const;

export type UiTableAlign = (typeof UI_TABLE_ALIGNS)[number];

export const DEFAULT_UI_TABLE_ALIGN: UiTableAlign = 'left';

const UI_TABLE_ALIGN_SET = new Set<string>(UI_TABLE_ALIGNS);

export function isUiTableAlign(value: unknown): value is UiTableAlign {
  return typeof value === 'string' && UI_TABLE_ALIGN_SET.has(value);
}

export function readUiTableAlign(
  value: unknown,
  fallback: UiTableAlign = DEFAULT_UI_TABLE_ALIGN,
): UiTableAlign {
  return isUiTableAlign(value) ? value : fallback;
}

export interface UiTableColumn<TItem, TCell = unknown> {
  header: TCell;
  accessor: (item: TItem) => TCell;
  className?: string;
  width?: string;
  sortKey?: string;
  align?: UiTableAlign;
}

export const UI_STATE_RENDERER_STATES = ['loading', 'error', 'empty', 'content'] as const;

export type UiStateRendererState = (typeof UI_STATE_RENDERER_STATES)[number];

export interface UiStateRendererFlags {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
}

export interface UiStateRendererEmptyAction<TIcon = unknown> extends UiEmptyStateAction {
  icon?: TIcon;
}

export function resolveUiStateRendererState(flags: UiStateRendererFlags): UiStateRendererState {
  if (flags.isLoading) return 'loading';
  if (flags.isError) return 'error';
  if (flags.isEmpty === true) return 'empty';
  return 'content';
}

export const UI_TOAST_TYPES = ['success', 'error', 'info', 'warning'] as const;

export type UiToastType = (typeof UI_TOAST_TYPES)[number];

export const DEFAULT_UI_TOAST_TYPE: UiToastType = 'success';
export const DEFAULT_UI_TOAST_TEST_ID = 'toast-message';
export const DEFAULT_UI_TOAST_AUTO_DISMISS_MS = 3000;
export const DEFAULT_UI_TOAST_STACK_LIMIT = 5;

export const UI_TOAST: Readonly<Record<Uppercase<UiToastType>, UiToastType>> = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
} as const;

const UI_TOAST_TYPE_SET = new Set<string>(UI_TOAST_TYPES);

export interface UiToastItem<TMessage = unknown> {
  id: string;
  message: TMessage;
  type: UiToastType;
}

export function isUiToastType(value: unknown): value is UiToastType {
  return typeof value === 'string' && UI_TOAST_TYPE_SET.has(value);
}

export function readUiToastType(
  value: unknown,
  fallback: UiToastType = DEFAULT_UI_TOAST_TYPE,
): UiToastType {
  return isUiToastType(value) ? value : fallback;
}

export function appendUiToastItem<TToast extends UiToastItem>(
  items: readonly TToast[],
  item: TToast,
  limit: number = DEFAULT_UI_TOAST_STACK_LIMIT,
): TToast[] {
  const nextItems = [...items, item];
  if (!Number.isInteger(limit) || limit <= 0) return nextItems;
  return nextItems.slice(-limit);
}
