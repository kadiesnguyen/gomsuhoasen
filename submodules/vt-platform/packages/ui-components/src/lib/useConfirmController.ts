import { useCallback, useState, type ReactNode } from 'react';

export type ConfirmDialogVariant = 'danger' | 'info' | 'warning';

export interface ConfirmControllerOptions<TError = string> {
  mapError?: (error: unknown) => TError | undefined;
  blockCloseWhileLoading?: boolean;
}

export interface ConfirmControllerRequest {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void | Promise<void>;
}

export interface ConfirmControllerState<TError = string> {
  isOpen: boolean;
  options: ConfirmControllerRequest | null;
  isLoading: boolean;
  actionError: TError | undefined;
  confirm: (options: ConfirmControllerRequest) => void;
  close: () => void;
  handleConfirm: () => Promise<void>;
}

export function useConfirmController<TError = string>(
  options: ConfirmControllerOptions<TError> = {},
): ConfirmControllerState<TError> {
  const { mapError, blockCloseWhileLoading = false } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [request, setRequest] = useState<ConfirmControllerRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<TError | undefined>(undefined);

  const close = useCallback(() => {
    if (blockCloseWhileLoading && isLoading) {
      return;
    }

    setIsOpen(false);
    setRequest(null);
    setIsLoading(false);
    setActionError(undefined);
  }, [blockCloseWhileLoading, isLoading]);

  const confirm = useCallback((nextRequest: ConfirmControllerRequest) => {
    setRequest(nextRequest);
    setActionError(undefined);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!request?.onConfirm) {
      close();
      return;
    }

    setIsLoading(true);
    try {
      await request.onConfirm();
      close();
    } catch (error) {
      setActionError(mapError ? mapError(error) : undefined);
      setIsLoading(false);
    }
  }, [close, mapError, request]);

  return {
    isOpen,
    options: request,
    isLoading,
    actionError,
    confirm,
    close,
    handleConfirm,
  };
}
