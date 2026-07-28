import * as React from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { readUiTableAlign, readUiTrimmedString, type UiTableColumn } from '@vt/ui-primitives';

const cx = (...tokens: Array<string | false | null | undefined>) =>
  tokens.filter((token): token is string => typeof token === 'string' && token.length > 0).join(' ');

export type RowDataAttrs = Record<string, string | undefined>;

const resolveRowDataAttrs = (attrs: RowDataAttrs | undefined): Record<string, string> | undefined => {
  if (!attrs) return undefined;
  const entries = Object.entries(attrs).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export interface Column<T> extends UiTableColumn<T, React.ReactNode> {
  header: React.ReactNode;
  accessor: (item: T) => React.ReactNode;
  className?: string;
  width?: string;
  sortKey?: string;
}

export interface TableLabels {
  loading?: React.ReactNode;
  empty?: React.ReactNode;
}

export interface TableTestIds {
  selectAllCheckbox?: string;
  rowCheckbox?: string;
  emptyState?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  compact?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  sortHeaderTestId?: string | ((sortKey: string) => string);
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  labels?: TableLabels;
  emptyMessage?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  testIds?: TableTestIds;
  'data-testid'?: string;
  rowTestId?: string | ((item: T) => string);
  rowDataAttrs?: (item: T) => RowDataAttrs;
}

const DEFAULT_LABELS: Required<TableLabels> = {
  loading: 'Loading...',
  empty: 'No data',
};

const normalizeNode = (node: React.ReactNode): React.ReactNode => React.Children.toArray(node);

const getColumnKey = <T,>(col: Column<T>, index: number): string => {
  const sortKey = readUiTrimmedString(col.sortKey);
  if (sortKey) return `sort:${sortKey}`;
  const header = readUiTrimmedString(col.header);
  if (header !== undefined) {
    return `header:${header}`;
  }
  return `col:${index}`;
};

const getColumnJustifyClass = <T,>(col: Column<T>): string => {
  const align = readUiTableAlign(col.align);
  if (align === 'right' || col.className?.includes('text-right')) return 'justify-end';
  if (align === 'center' || col.className?.includes('text-center')) return 'justify-center';
  return 'justify-start';
};

export const Table = <T,>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  isLoading,
  compact = false,
  sortColumn,
  sortDirection,
  onSort,
  sortHeaderTestId,
  selectable,
  selectedIds = [],
  onSelectionChange,
  labels = {},
  emptyMessage,
  emptyIcon,
  testIds = {},
  'data-testid': dataTestId,
  rowTestId,
  rowDataAttrs,
}: TableProps<T>) => {
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const resolvedEmpty = emptyMessage ?? resolvedLabels.empty;

  const handleHeaderClick = (col: Column<T>) => {
    const sortKey = readUiTrimmedString(col.sortKey);
    if (sortKey && onSort) {
      onSort(sortKey);
    }
  };

  const headerCells = React.Children.toArray([
    selectable ? (
      <th key="select-all" className="px-4 py-2.5 w-10 sticky top-0 bg-zinc-50 z-10">
        <input
          type="checkbox"
          data-testid={testIds.selectAllCheckbox}
          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          checked={data.length > 0 && selectedIds.length === data.length}
          onChange={(e) => {
            if (onSelectionChange) {
              onSelectionChange(e.target.checked ? data.map(keyExtractor) : []);
            }
          }}
        />
      </th>
    ) : null,
    ...columns.map((col, idx) => {
      const sortKey = readUiTrimmedString(col.sortKey);
      const isSortable = sortKey !== undefined && !!onSort;
      const isSorted = sortKey !== undefined && sortColumn === sortKey;
      const columnKey = getColumnKey(col, idx);
      const resolvedSortHeaderTestId =
        isSortable && sortHeaderTestId
          ? typeof sortHeaderTestId === 'function'
            ? sortHeaderTestId(sortKey)
            : sortHeaderTestId
          : undefined;

      return (
        <th
          key={columnKey}
          data-testid={resolvedSortHeaderTestId}
          data-sort-key={isSortable ? sortKey : undefined}
          data-sort-active={isSortable ? String(isSorted) : undefined}
          data-sort-direction={isSorted ? sortDirection : undefined}
          className={cx(
            'px-4 py-2.5 whitespace-nowrap sticky top-0 bg-zinc-50 z-10',
            col.className,
            isSortable ? 'cursor-pointer hover:bg-zinc-100 transition-colors select-none' : undefined,
          )}
          style={{ width: col.width, textAlign: readUiTableAlign(col.align) }}
          onClick={() => handleHeaderClick(col)}
        >
          <div className={`flex items-center gap-1 ${getColumnJustifyClass(col)}`}>
            {normalizeNode(col.header)}
            {isSortable && (
              <span className="text-zinc-400">
                {isSorted ? (
                  sortDirection === 'asc' ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )
                ) : (
                  <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-50" />
                )}
              </span>
            )}
          </div>
        </th>
      );
    }),
  ]);

  const bodyRows = React.Children.toArray(
    data.map((item) => {
      const rowKey = keyExtractor(item);
      const rowCells = React.Children.toArray([
        selectable ? (
          <td key={`${rowKey}:select`} className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              data-testid={testIds.rowCheckbox}
              data-row-id={rowKey}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              checked={selectedIds.includes(rowKey)}
              onChange={(e) => {
                if (onSelectionChange) {
                  const id = rowKey;
                  if (e.target.checked) {
                    onSelectionChange([...selectedIds, id]);
                  } else {
                    onSelectionChange(selectedIds.filter((sid) => sid !== id));
                  }
                }
              }}
            />
          </td>
        ) : null,
        ...columns.map((col, colIdx) => {
          const columnKey = getColumnKey(col, colIdx);
          return (
            <td
              key={`${rowKey}:${columnKey}`}
              className={cx(
                'px-4 py-2 text-zinc-700 whitespace-nowrap',
                compact ? 'py-1.5' : 'py-2.5',
                col.className,
              )}
              style={{ textAlign: readUiTableAlign(col.align) }}
            >
              {normalizeNode(col.accessor(item))}
            </td>
          );
        }),
      ]);

      const resolvedRowTestId = typeof rowTestId === 'function' ? rowTestId(item) : rowTestId;
      const resolvedRowDataAttrs = resolveRowDataAttrs(rowDataAttrs ? rowDataAttrs(item) : undefined);

      return (
        <tr
          key={rowKey}
          onClick={() => onRowClick?.(item)}
          data-testid={resolvedRowTestId}
          data-id={rowKey}
          data-selected={selectedIds.includes(rowKey) ? 'true' : 'false'}
          {...resolvedRowDataAttrs}
          className={`group transition-colors ${
            onRowClick ? 'cursor-pointer hover:bg-zinc-50/80' : 'hover:bg-zinc-50/30'
          } ${selectedIds.includes(rowKey) ? 'bg-blue-50/50' : ''}`}
        >
          {rowCells}
        </tr>
      );
    }),
  );

  if (isLoading) {
    return (
      <div className="w-full h-40 flex flex-col items-center justify-center text-zinc-400 text-sm bg-white border border-zinc-200 rounded-lg table-loading-container">
        <div className="w-5 h-5 border-2 border-zinc-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
        <span>{resolvedLabels.loading}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        data-testid={testIds.emptyState}
        className="w-full p-8 text-center text-zinc-500 text-sm bg-white border border-dashed border-zinc-200 rounded-lg empty-state"
      >
        {emptyIcon ? <div className="mb-2 text-lg leading-none">{normalizeNode(emptyIcon)}</div> : null}
        {resolvedEmpty}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-zinc-200 rounded-lg bg-white shadow-sm" data-testid={dataTestId}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              {headerCells}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm">{bodyRows}</tbody>
        </table>
      </div>
    </div>
  );
};
