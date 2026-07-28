import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  DEFAULT_UI_TOAST_STACK_LIMIT,
  type UiToastType,
} from '@vt/ui-primitives';
import { useToastController } from '@vt/ui-components';

export type ToastType = UiToastType;

interface ToastContextValue {
  toast: (message: ReactNode, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const stackStyle: CSSProperties = {
  position: 'fixed',
  right: 20,
  bottom: 20,
  zIndex: 1200,
  display: 'grid',
  gap: 10,
  width: 'min(360px, calc(100vw - 40px))',
  pointerEvents: 'none',
};

const baseStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  gap: 10,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid',
  background: '#fff',
  boxShadow: '0 12px 36px rgba(25, 23, 20, 0.16)',
  fontSize: '0.88rem',
  fontWeight: 600,
  pointerEvents: 'auto',
};

const GHS_TOAST_AUTO_DISMISS_MS = 3600;

const tone: Record<ToastType, { border: string; color: string; icon: string }> = {
  success: { border: '#bbf7d0', color: '#047857', icon: 'OK' },
  error: { border: '#fecaca', color: '#b91c1c', icon: '!' },
  warning: { border: '#fde68a', color: '#b45309', icon: '!' },
  info: { border: '#bfdbfe', color: '#2563eb', icon: 'i' },
};

const createToastId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const {
    items,
    toast,
    removeToast,
  } = useToastController<ReactNode>({
    createId: createToastId,
    autoDismissMs: GHS_TOAST_AUTO_DISMISS_MS,
    stackLimit: DEFAULT_UI_TOAST_STACK_LIMIT,
  });

  const value = useMemo<ToastContextValue>(
    () => ({ toast: (message, type) => void toast(message, type) }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={stackStyle} aria-live="polite" aria-relevant="additions">
        {items.map((item) => {
          const palette = tone[item.type];
          return (
            <div
              key={item.id}
              style={{ ...baseStyle, borderColor: palette.border, color: palette.color }}
              role="status"
            >
              <span aria-hidden="true">{palette.icon}</span>
              <span>{item.message}</span>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                aria-label="Dismiss notification"
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('TOAST_CONTEXT_PROVIDER_REQUIRED');
  return context;
}
