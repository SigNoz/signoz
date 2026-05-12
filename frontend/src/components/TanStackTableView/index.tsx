import { TanStackTableBase } from './TanStackTable';
import TanStackTableText from './TanStackTableText';

export * from './TanStackTableStateContext';
export * from './types';
export * from './useColumnState';
export * from './useColumnStore';
export * from './useTableParams';

/**
 * Virtualized data table built on TanStack Table and `react-virtuoso`: resizable and pinnable columns,
 * optional drag-to-reorder headers, expandable rows, and pagination or infinite scroll.
 *
 * @example Minimal usage
 * ```tsx
 * import TanStackTable from 'components/TanStackTableView';
 * import type { TableColumnDef } from 'components/TanStackTableView';
 *
 * type Row = { id: string; name: string };
 *
 * const columns: TableColumnDef<Row>[] = [
 *   {
 *     id: 'name',
 *     header: 'Name',
 *     accessorKey: 'name',
 *     cell: ({ value }) => <TanStackTable.Text>{String(value ?? '')}</TanStackTable.Text>,
 *   },
 * ];
 *
 * function Example(): JSX.Element {
 *   return <TanStackTable<Row> data={rows} columns={columns} />;
 * }
 * ```
 *
 * @example Column definitions — `accessorFn`, custom header, pinned column, sortable
 * ```tsx
 * const columns: TableColumnDef<Row>[] = [
 *   {
 *     id: 'id',
 *     header: 'ID',
 *     accessorKey: 'id',
 *     pin: 'left',
 *     width: { min: 80, default: 120 },
 *     enableSort: true,
 *     cell: ({ value }) => <TanStackTable.Text>{String(value)}</TanStackTable.Text>,
 *   },
 *   {
 *     id: 'computed',
 *     header: () => <span>Computed</span>,
 *     accessorFn: (row) => row.first + row.last,
 *     enableMove: false,
 *     enableRemove: false,
 *     cell: ({ value }) => <TanStackTable.Text>{String(value)}</TanStackTable.Text>,
 *   },
 * ];
 * ```
 *
 * @example Column state persistence with store (recommended)
 * ```tsx
 * <TanStackTable
 *   data={data}
 *   columns={columns}
 *   columnStorageKey="my-table-columns"
 * />
 * ```
 *
 * @example Pagination with query params. Use `enableQueryParams` object to customize param names.
 * ```tsx
 * <TanStackTable
 *   data={pageRows}
 *   columns={columns}
 *   pagination={{ total: totalCount, defaultPage: 1, defaultLimit: 20 }}
 *   enableQueryParams={{
 *     page: 'listPage',
 *     limit: 'listPageSize',
 *     orderBy: 'orderBy',
 *     expanded: 'listExpanded',
 *   }}
 *   prefixPaginationContent={<span>Custom prefix</span>}
 *   suffixPaginationContent={<span>Custom suffix</span>}
 * />
 * ```
 *
 * @example Infinite scroll — use `onEndReached` (pagination UI is hidden when set).
 * ```tsx
 * <TanStackTable
 *   data={accumulatedRows}
 *   columns={columns}
 *   onEndReached={(lastIndex) => fetchMore(lastIndex)}
 *   isLoading={isFetching}
 * />
 * ```
 *
 * @example Loading state and typography for plain string/number cells
 * ```tsx
 * <TanStackTable
 *   data={data}
 *   columns={columns}
 *   isLoading={isFetching}
 *   skeletonRowCount={15}
 *   cellTypographySize="small"
 *   plainTextCellLineClamp={2}
 * />
 * ```
 *
 * @example Row styling, selection, and actions. `onRowClick` receives `(row, itemKey)`.
 * ```tsx
 * <TanStackTable
 *   data={data}
 *   columns={columns}
 *   getRowKey={(row) => row.id}
 *   getItemKey={(row) => row.id}
 *   isRowActive={(row) => row.id === selectedId}
 *   activeRowIndex={selectedIndex}
 *   onRowClick={(row, itemKey) => setSelectedId(itemKey)}
 *   onRowClickNewTab={(row, itemKey) => openInNewTab(itemKey)}
 *   onRowDeactivate={() => setSelectedId(undefined)}
 *   getRowClassName={(row) => (row.severity === 'error' ? 'row-error' : '')}
 *   getRowStyle={(row) => (row.dimmed ? { opacity: 0.5 } : {})}
 *   renderRowActions={(row) => <Button size="small">Open</Button>}
 * />
 * ```
 *
 * @example Expandable rows. `renderExpandedRow` receives `(row, rowKey, groupMeta?)`.
 * ```tsx
 * <TanStackTable
 *   data={data}
 *   columns={columns}
 *   getRowKey={(row) => row.id}
 *   renderExpandedRow={(row, rowKey, groupMeta) => (
 *     <pre>{JSON.stringify({ rowKey, groupMeta, raw: row.raw }, null, 2)}</pre>
 *   )}
 *   getRowCanExpand={(row) => Boolean(row.raw)}
 * />
 * ```
 *
 * @example Grouped rows — use `groupBy` + `getGroupKey` for group-aware key generation.
 * ```tsx
 * <TanStackTable
 *   data={data}
 *   columns={columns}
 *   getRowKey={(row) => row.id}
 *   groupBy={[{ key: 'namespace' }, { key: 'cluster' }]}
 *   getGroupKey={(row) => row.meta ?? {}}
 *   renderExpandedRow={(row, rowKey, groupMeta) => (
 *     <ExpandedDetails groupMeta={groupMeta} />
 *   )}
 *   getRowCanExpand={() => true}
 * />
 * ```
 *
 * @example Imperative handle — `goToPage` plus Virtuoso methods (e.g. `scrollToIndex`)
 * ```tsx
 * import type { TanStackTableHandle } from 'components/TanStackTableView';
 *
 * const ref = useRef<TanStackTableHandle>(null);
 *
 * <TanStackTable ref={ref} data={data} columns={columns} pagination={{ total, defaultLimit: 20 }} />;
 *
 * ref.current?.goToPage(2);
 * ref.current?.scrollToIndex({ index: 0, align: 'start' });
 * ```
 *
 * @example Scroll container props and testing
 * ```tsx
 * <TanStackTable
 *   data={data}
 *   columns={columns}
 *   className="my-table-wrapper"
 *   testId="logs-table"
 *   tableScrollerProps={{ className: 'my-table-scroll', 'data-testid': 'logs-scroller' }}
 * />
 * ```
 *
 * @example Disable virtual scroll — useful for nested tables inside expanded rows.
 * Virtual scroll requires a fixed height container, which is problematic for nested tables
 * that need dynamic height. Use `disableVirtualScroll` when rendering tables inside
 * `renderExpandedRow` to allow the nested table to grow based on content.
 * Note: Cannot be combined with `onEndReached` (infinite scroll requires virtualization).
 * ```tsx
 * // Parent table with expandable rows
 * <TanStackTable
 *   data={parentData}
 *   columns={parentColumns}
 *   renderExpandedRow={(row) => (
 *     // Nested table without virtualization — height adapts to content
 *     <TanStackTable
 *       data={row.children}
 *       columns={childColumns}
 *       disableVirtualScroll
 *     />
 *   )}
 * />
 * ```
 */
const TanStackTable = Object.assign(TanStackTableBase, {
	Text: TanStackTableText,
});

export default TanStackTable;
