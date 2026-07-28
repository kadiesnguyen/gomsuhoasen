import * as React from 'react';
import { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'right' | 'top' | 'bottom' | 'left';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'right',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses: Record<string, string> = {
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  };

  const arrowClasses: Record<string, string> = {
    right: 'border-l border-b left-[-5px] top-1/2 -translate-y-1/2',
    left: 'border-r border-t right-[-5px] top-1/2 -translate-y-1/2',
    top: 'border-r border-b bottom-[-5px] left-1/2 -translate-x-1/2',
    bottom: 'border-l border-t top-[-5px] left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`relative flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-[100] px-2.5 py-1.5 text-[11px] font-medium text-white bg-zinc-900 border border-zinc-800 rounded-md shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${positionClasses[side]}`}
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-zinc-900 border-zinc-800 rotate-45 ${arrowClasses[side]}`}
          />
        </div>
      )}
    </div>
  );
};
