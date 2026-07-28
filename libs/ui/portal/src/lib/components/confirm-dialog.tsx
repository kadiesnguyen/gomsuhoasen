// Task card: Cross-Cutting UI Hardening
// Refs read:
// - C:\Works\fitzalominiapp\v2\apps\v2-portal\src\components\ui\ConfirmDialog.tsx
// - C:\Works\fitzalominiapp\v2\apps\v2-portal\src\contexts\ConfirmContext.tsx
// Kept: provider + hook + async loading. Dropped: local HTML/CSS, using shared ConfirmDialog.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  ConfirmDialog,
  useConfirmController,
  type ConfirmControllerRequest,
} from '@vt/ui-components';
import { readDisplayText } from '../utils/display-normalization';

type ConfirmOptions = ConfirmControllerRequest;

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const {
    options,
    isLoading,
    actionError,
    confirm,
    close,
    handleConfirm,
  } = useConfirmController<string>({
    blockCloseWhileLoading: true,
    mapError: () => 'Thao t\u00E1c ch\u01B0a ho\u00E0n t\u1EA5t. Vui l\u00F2ng th\u1EED l\u1EA1i.',
  });

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={options !== null}
        title={options?.title ?? ''}
        description={
          <>
            {options?.description}
            {actionError && <div style={{ marginTop: 10, color: '#b91c1c', fontSize: '0.82rem' }}>{actionError}</div>}
          </>
        }
        confirmLabel={readDisplayText(options?.confirmLabel, 'X\u00E1c nh\u1EADn')}
        cancelLabel={readDisplayText(options?.cancelLabel, 'H\u1EE7y')}
        variant={options?.variant ?? 'danger'}
        isLoading={isLoading}
        onConfirm={() => void handleConfirm()}
        onCancel={close}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('CONFIRM_CONTEXT_PROVIDER_REQUIRED');
  return context;
}
