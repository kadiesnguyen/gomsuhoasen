import * as React from 'react';

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: React.ComponentType<{ size?: number; className?: string }>;
  /** Optional badge or count to display next to the label */
  readonly badge?: React.ReactNode;
}

export interface TabsProps {
  readonly tabs: readonly TabItem[];
  readonly activeTabId: string;
  readonly onTabChange: (tabId: string) => void;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly size?: 'sm' | 'md';
  readonly className?: string;
  readonly testIdPrefix?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  orientation = 'horizontal',
  size = 'md',
  className = '',
  testIdPrefix,
}) => {
  return (
    <div
      className={`flex ${
        orientation === 'horizontal' ? 'flex-row items-center border-b border-border/40 gap-6' : 'flex-col gap-1'
      } ${className}`}
      role="tablist"
      aria-orientation={orientation}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        const Icon = tab.icon;

        const baseClasses =
          'relative flex items-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 whitespace-nowrap cursor-pointer';

        const sizeClasses =
          size === 'sm'
            ? orientation === 'horizontal'
              ? 'py-3 text-sm'
              : 'py-2 px-3 text-sm rounded-md'
            : orientation === 'horizontal'
            ? 'py-4 text-base'
            : 'py-2.5 px-4 text-base rounded-md';

        const activeClasses = isActive
          ? orientation === 'horizontal'
            ? 'text-primary font-semibold'
            : 'bg-primary/10 text-primary font-semibold'
          : orientation === 'horizontal'
          ? 'text-muted-foreground hover:text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium';

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${baseClasses} ${sizeClasses} ${activeClasses}`}
            onClick={() => onTabChange(tab.id)}
            data-testid={testIdPrefix ? `${testIdPrefix}-${tab.id}` : undefined}
          >
            {Icon && (
              <Icon
                size={size === 'sm' ? 16 : 18}
                className={`mr-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-2 inline-flex items-center justify-center bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {tab.badge}
              </span>
            )}
            {/* Horizontal active indicator */}
            {isActive && orientation === 'horizontal' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
