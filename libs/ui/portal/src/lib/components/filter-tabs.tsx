export interface FilterTabItem {
  id: string;
  label: string;
  badge?: number;
}

export interface FilterTabsProps {
  tabs: readonly FilterTabItem[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  ariaLabel?: string;
}

export function FilterTabs({
  tabs,
  activeTabId,
  onTabChange,
  ariaLabel = 'Lọc theo trạng thái',
}: FilterTabsProps) {
  return (
    <div className="ghs-filter-chips" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ghs-filter-chip${isActive ? ' is-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="ghs-filter-chip__label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 ? (
              <span className="ghs-filter-chip__count">{tab.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
