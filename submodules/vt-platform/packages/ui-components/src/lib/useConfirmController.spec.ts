/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { useConfirmController } from './useConfirmController';

function createDeferredPromise<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

describe('useConfirmController', () => {
  it('opens a request and closes it after a successful confirm action', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmController<string>());

    act(() => {
      result.current.confirm({
        title: 'Delete item',
        description: 'Confirm deletion.',
        onConfirm,
      });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options?.title).toBe('Delete item');

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toBeNull();
    expect(result.current.actionError).toBeUndefined();
  });

  it('maps async errors and keeps the request open for retry', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('delete failed'));
    const { result } = renderHook(() =>
      useConfirmController<string>({
        mapError: () => 'Delete failed',
      }),
    );

    act(() => {
      result.current.confirm({
        title: 'Delete item',
        description: 'Confirm deletion.',
        onConfirm,
      });
    });

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.actionError).toBe('Delete failed');
  });

  it('can block close while an async confirm action is still running', async () => {
    const deferred = createDeferredPromise<void>();
    const { result } = renderHook(() =>
      useConfirmController<string>({
        blockCloseWhileLoading: true,
      }),
    );

    act(() => {
      result.current.confirm({
        title: 'Delete item',
        description: 'Confirm deletion.',
        onConfirm: () => deferred.promise,
      });
    });

    let pendingConfirm: Promise<void> | undefined;
    act(() => {
      pendingConfirm = result.current.handleConfirm();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options?.title).toBe('Delete item');

    await act(async () => {
      deferred.resolve();
      await pendingConfirm;
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
