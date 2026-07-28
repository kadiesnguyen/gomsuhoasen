import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_UI_TOAST_AUTO_DISMISS_MS,
  DEFAULT_UI_TOAST_STACK_LIMIT,
  DEFAULT_UI_TOAST_TYPE,
  appendUiToastItem,
  type UiToastItem,
  type UiToastType,
} from '@vt/ui-primitives';

export type ToastDismissCanceler = () => void;

export type ToastDismissScheduler = (
  handler: () => void,
  delayMs: number,
) => ToastDismissCanceler;

export interface ToastControllerOptions {
  createId?: () => string;
  scheduleAutoDismiss?: ToastDismissScheduler;
  autoDismissMs?: number;
  stackLimit?: number;
}

export interface ToastController<TMessage = unknown> {
  items: UiToastItem<TMessage>[];
  addToast: (message: TMessage, type?: UiToastType) => string;
  toast: (message: TMessage, type?: UiToastType) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const defaultCreateToastId = (): string =>
  `toast_${Math.random().toString(36).slice(2, 10)}`;

const defaultScheduleAutoDismiss: ToastDismissScheduler = (handler, delayMs) => {
  const timeoutId = globalThis.setTimeout(handler, delayMs);
  return () => {
    globalThis.clearTimeout(timeoutId);
  };
};

const shouldScheduleAutoDismiss = (delayMs: number): boolean =>
  Number.isFinite(delayMs) && delayMs > 0;

export function useToastController<TMessage = unknown>(
  options: ToastControllerOptions = {},
): ToastController<TMessage> {
  const {
    createId = defaultCreateToastId,
    scheduleAutoDismiss = defaultScheduleAutoDismiss,
    autoDismissMs = DEFAULT_UI_TOAST_AUTO_DISMISS_MS,
    stackLimit = DEFAULT_UI_TOAST_STACK_LIMIT,
  } = options;
  const dismissersRef = useRef(new Map<string, ToastDismissCanceler>());
  const [items, setItems] = useState<UiToastItem<TMessage>[]>([]);

  const clearScheduledDismiss = useCallback((id: string) => {
    const cancel = dismissersRef.current.get(id);
    if (!cancel) return;
    dismissersRef.current.delete(id);
    cancel();
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      clearScheduledDismiss(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [clearScheduledDismiss],
  );

  const clearToasts = useCallback(() => {
    for (const cancel of dismissersRef.current.values()) {
      cancel();
    }
    dismissersRef.current.clear();
    setItems([]);
  }, []);

  useEffect(() => clearToasts, [clearToasts]);

  const addToast = useCallback(
    (message: TMessage, type: UiToastType = DEFAULT_UI_TOAST_TYPE) => {
      const id = createId();
      const nextItem: UiToastItem<TMessage> = { id, message, type };

      setItems((prev) => {
        const next = appendUiToastItem(prev, nextItem, stackLimit);
        if (next.length === prev.length + 1) {
          return next;
        }

        const keptIds = new Set(next.map((item) => item.id));
        for (const previousItem of prev) {
          if (!keptIds.has(previousItem.id)) {
            clearScheduledDismiss(previousItem.id);
          }
        }
        return next;
      });

      if (shouldScheduleAutoDismiss(autoDismissMs)) {
        const cancel = scheduleAutoDismiss(() => {
          dismissersRef.current.delete(id);
          setItems((prev) => prev.filter((item) => item.id !== id));
        }, autoDismissMs);
        dismissersRef.current.set(id, cancel);
      }

      return id;
    },
    [
      autoDismissMs,
      clearScheduledDismiss,
      createId,
      scheduleAutoDismiss,
      stackLimit,
    ],
  );

  return {
    items,
    addToast,
    toast: addToast,
    removeToast,
    clearToasts,
  };
}
