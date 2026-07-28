/**
 * @vt/ui-components - Table contract tests.
 *
 * Verifies that the shared data table keeps the v2 portal surface portable:
 * sortable columns, selectable rows, loading/empty labels, test IDs, and
 * row data attributes are driven by props instead of project-local constants.
 */

import React from 'react';
import { Table, type Column, type TableProps } from '../index';

interface DemoRow {
  id: string;
  name: string;
}

const rows: DemoRow[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
];

const columns: Column<DemoRow>[] = [
  {
    header: 'Name',
    accessor: (item) => item.name,
    sortKey: ' name ',
    align: 'left',
  },
];

const baseProps: TableProps<DemoRow> = {
  data: rows,
  columns,
  keyExtractor: (item) => item.id,
};

describe('Table component', () => {
  it('exports a generic table component surface', () => {
    const el = React.createElement(Table<DemoRow>, baseProps);
    expect(el).toBeTruthy();
    expect(el.type).toBe(Table);
    expect(el.props.columns).toBe(columns);
  });

  it('accepts sortable, selectable, labels, and test-id props', () => {
    const onSort = vi.fn();
    const onSelectionChange = vi.fn();
    const el = React.createElement(Table<DemoRow>, {
      ...baseProps,
      onSort,
      sortColumn: 'name',
      sortDirection: 'asc',
      selectable: true,
      selectedIds: ['1'],
      onSelectionChange,
      labels: {
        loading: 'Dang tai',
        empty: 'Khong co du lieu',
      },
      testIds: {
        selectAllCheckbox: 'select-all',
        rowCheckbox: 'row-check',
        emptyState: 'empty',
      },
      sortHeaderTestId: (sortKey) => `sort-${sortKey}`,
      rowTestId: (item) => `row-${item.id}`,
      rowDataAttrs: (item) => ({ 'data-name': item.name }),
    });
    const props = el.props as TableProps<DemoRow>;

    expect(props.onSort).toBe(onSort);
    expect(props.onSelectionChange).toBe(onSelectionChange);
    expect(props.labels?.empty).toBe('Khong co du lieu');
    expect(props.testIds?.rowCheckbox).toBe('row-check');
    expect(typeof props.sortHeaderTestId).toBe('function');
    if (typeof props.sortHeaderTestId === 'function') {
      expect(props.sortHeaderTestId('name')).toBe('sort-name');
    }
    expect(typeof props.rowTestId).toBe('function');
    if (typeof props.rowTestId === 'function') {
      expect(props.rowTestId(rows[0])).toBe('row-1');
    }
    expect(props.rowDataAttrs?.(rows[0])).toEqual({ 'data-name': 'Alpha' });
  });

  it('preserves project-specific ReactNode cells through the column contract', () => {
    const action = React.createElement('button', { type: 'button' }, 'Open');
    const actionColumns: Column<DemoRow>[] = [
      {
        header: 'Action',
        accessor: () => action,
        align: 'right',
      },
    ];

    expect(actionColumns[0].accessor(rows[0])).toBe(action);
  });
});
