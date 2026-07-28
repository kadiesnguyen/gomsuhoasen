import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  DEFAULT_UI_PAGE_LOADER_SIZE,
  DEFAULT_UI_PAGE_LOADER_TONE,
  DEFAULT_UI_SPINNER_SIZE,
  DEFAULT_UI_SPINNER_TONE,
  readUiSpinnerSize,
  readUiSpinnerTone,
  type UiSpinnerSize,
  type UiSpinnerTone,
} from '@vt/ui-primitives';

type SpinnerSize = UiSpinnerSize;
type SpinnerTone = UiSpinnerTone;

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  testId?: string;
}

export interface PageLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: SpinnerSize;
  tone?: SpinnerTone;
  spinnerClassName?: string;
  testId?: string;
  /** Wrapper layout class used by portal loader consumers. */
  containerClassName?: string;
}

const SPINNER_SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
};

const SPINNER_TONE_CLASS: Record<SpinnerTone, string> = {
  primary: 'text-blue-600',
  muted: 'text-zinc-400',
  inverse: 'text-white',
};

const joinCx = (...classes: (string | undefined | false)[]) =>
  classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' ');

export const Spinner: React.FC<SpinnerProps> = ({
  size = DEFAULT_UI_SPINNER_SIZE,
  tone = DEFAULT_UI_SPINNER_TONE,
  className = '',
  testId,
  ...props
}) => {
  const safeSize = readUiSpinnerSize(size);
  const safeTone = readUiSpinnerTone(tone);
  return (
    <Loader2
      data-testid={testId}
      className={joinCx('animate-spin', SPINNER_SIZE_CLASS[safeSize], SPINNER_TONE_CLASS[safeTone], className)}
      {...props}
    />
  );
};

export const PageLoader: React.FC<PageLoaderProps> = ({
  label,
  className = 'h-64',
  size = DEFAULT_UI_PAGE_LOADER_SIZE,
  tone = DEFAULT_UI_PAGE_LOADER_TONE,
  spinnerClassName = '',
  testId,
  containerClassName,
  ...props
}) => (
  <div
    data-testid={testId}
    className={joinCx('flex items-center justify-center', className, containerClassName)}
    {...props}
  >
    <div className="flex flex-col items-center gap-3">
      <Spinner size={size} tone={tone} className={spinnerClassName} />
      {label ? <p className="text-sm text-zinc-500">{label}</p> : null}
    </div>
  </div>
);
