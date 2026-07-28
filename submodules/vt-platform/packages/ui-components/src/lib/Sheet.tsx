import * as React from 'react';
import { PanelShell } from './PanelShell';

export interface SheetProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
  depth?: number;
  isTopmost?: boolean;
  'data-testid'?: string;
}

export const Sheet: React.FC<SheetProps> = (props: SheetProps) => {
  const {
    title,
    description,
    children,
    onClose,
    width = 'max-w-2xl',
    depth = 0,
    isTopmost = true,
    'data-testid': dataTestId,
  } = props;
  return (
    <PanelShell
      title={title}
      description={description}
      onClose={onClose}
      width={width}
      depth={depth}
      isTopmost={isTopmost}
      data-testid={dataTestId}
    >
      {children}
    </PanelShell>
  );
};
