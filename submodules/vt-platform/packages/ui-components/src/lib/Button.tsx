import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import {
  DEFAULT_UI_BUTTON_SIZE,
  DEFAULT_UI_BUTTON_VARIANT,
  readUiButtonSize,
  readUiButtonVariant,
  type UiButtonSize,
  type UiButtonVariant,
} from '@vt/ui-primitives';

export type ButtonVariant = UiButtonVariant;
export type ButtonSize = UiButtonSize;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = DEFAULT_UI_BUTTON_VARIANT,
  size = DEFAULT_UI_BUTTON_SIZE,
  isLoading,
  asChild = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const safeVariant = readUiButtonVariant(variant);
  const safeSize = readUiButtonSize(size);

    const baseStyle =
      'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none rounded-md tracking-tight whitespace-nowrap active:scale-[0.98]';

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover shadow-dense border border-transparent',
      secondary:
        'bg-white text-zinc-900 border border-input hover:bg-zinc-50 shadow-dense',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-dense',
      ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
      outline:
        'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
    };

    const sizes: Record<ButtonSize, string> = {
      xs: 'h-6 px-2 text-xs rounded-sm',
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-6 text-base',
      icon: 'h-8 w-8 p-0',
    };

    const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={`${baseStyle} ${variants[safeVariant]} ${sizes[safeSize]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : null}
      {children}
    </Comp>
  );
};

Button.displayName = 'Button';
