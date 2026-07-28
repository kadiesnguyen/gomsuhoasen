import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

/**
 * Max-width cap for nested panels (depth > 0).
 * PanelShell owns zone sizing for nested layers — child components
 * should NOT pass their own width.
 */
const NESTED_MAX_WIDTH = 'max-w-4xl';

export interface PanelShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  /** TW max-width class. Used at depth=0 (root / Sheet). Ignored for nested panels. */
  width?: string;
  depth?: number;
  isTopmost?: boolean;
  'data-testid'?: string;
}

/**
 * PanelShell — slide-over panel with depth-aware nesting.
 *
 * Extracted from zalominiapp portal.
 * Refactored: replaced portal-specific keydown listener with standard addEventListener.
 *
 * Features:
 * - depth=0: root panel with backdrop
 * - depth>0: nested panel, 10% narrower per level
 * - ESC key closes topmost panel
 * - Animate in from right
 */
export const PanelShell: React.FC<PanelShellProps> = ({
  title,
  description,
  children,
  onClose,
  width = 'max-w-2xl',
  depth = 0,
  isTopmost = true,
  'data-testid': dataTestId,
}) => {
  useEffect(() => {
    if (!isTopmost) return undefined;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isTopmost, onClose]);

  const isNested = depth > 0;

  const zoneStyle = useMemo<React.CSSProperties>(() => {
    if (isNested) {
      return {
        right: 0,
        width: `calc(100% - ${depth * 10}%)`,
      };
    }
    return { right: 0 };
  }, [depth, isNested]);

  const widthClasses = isNested ? NESTED_MAX_WIDTH : `w-full ${width}`;

  return (
    <div
      className="fixed inset-0"
      role="dialog"
      aria-modal="true"
      data-testid={dataTestId}
      style={{ zIndex: 100 + depth * 10 }}
    >
      <div
        className={`absolute inset-0 ${isTopmost ? 'bg-zinc-900/40 backdrop-blur-[2px]' : 'bg-transparent pointer-events-none'} animate-fade-in`}
        onClick={isTopmost ? onClose : undefined}
      />

      <div
        className={`absolute top-0 bottom-0 ${widthClasses} bg-white shadow-2xl flex flex-col animate-slide-in-right`}
        style={zoneStyle}
      >
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
            <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
              {title}
            </h2>
            {description ? (
              <p className="text-[10px] text-zinc-500 mt-0.5">{description}</p>
            ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};
