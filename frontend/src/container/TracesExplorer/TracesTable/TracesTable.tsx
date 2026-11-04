import { useCallback, useRef } from 'react';
import { useAppNavigate } from 'lib/router/useAppNavigate';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import TanStackTable from 'components/TanStackTableView';
import type {
	CellTypographySize,
	TableColumnDef,
} from 'components/TanStackTableView/types';
import { useRecoverFromEmptyPage } from 'components/TanStackTableView/useRecoverFromEmptyPage';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { TracesLoading } from 'container/TracesExplorer/TraceLoading/TraceLoading';
import APIError from 'types/api/error';
import { DataSource, PanelTypeKeys } from 'types/common/queryBuilder';
import { noop } from 'lodash-es';
import { getAbsoluteUrl } from 'utils/basePath';

import { TRACES_TABLE_QUERY_PARAMS } from './constants';
import type { TracesTableRow } from './getFieldColumn';
import type { TracesTablePagination } from './useTracesTablePagination';
import { getRollingTotal } from './utils';

import styles from './TracesTable.module.scss';

// The API can return the same span twice; the table suffixes repeated keys so each row hovers on its own.
const getRowKey = (row: TracesTableRow): string => row.id;

export type TracesTableProps = {
	data: TracesTableRow[];
	columns: TableColumnDef<TracesTableRow>[];
	columnStorageKey?: string;
	respectColumnOrder?: boolean;
	panelType: PanelTypeKeys;
	/** Builds the trace-detail href for a row; drives row click + cmd/ctrl-click. */
	getRowHref: (row: TracesTableRow) => string;
	/** Replaces the default row click, which opens the trace detail page. */
	onRowClick?: (row: TracesTableRow) => void;
	isRowActive?: (row: TracesTableRow) => boolean;
	activeRowIndex?: number;
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: APIError | Error | null;
	isFilterApplied: boolean;
	onColumnOrderChange?: (cols: TableColumnDef<TracesTableRow>[]) => void;
	onColumnRemove?: (columnId: string) => void;
	cellTypographySize?: CellTypographySize;
	pagination?: TracesTablePagination;
	/** Loads the next page when the scroll reaches the last row; hides the pager. */
	onEndReached?: () => void;
};

function TracesTable({
	data,
	columns,
	columnStorageKey,
	respectColumnOrder = false,
	panelType,
	getRowHref,
	onRowClick,
	isRowActive,
	activeRowIndex,
	isLoading,
	isFetching,
	isError,
	error,
	isFilterApplied,
	onColumnOrderChange,
	onColumnRemove,
	cellTypographySize = 'medium',
	pagination,
	onEndReached,
}: TracesTableProps): JSX.Element {
	const navigate = useAppNavigate();

	// While the next page loads, `data` is still the previous page, so its rows
	// cannot size the total for the new offset.
	const settledTotalRef = useRef(0);
	if (pagination && !isFetching) {
		settledTotalRef.current = getRollingTotal(
			pagination.request.offset,
			data.length,
			pagination.limit,
		);
	}
	const total = settledTotalRef.current;

	useRecoverFromEmptyPage({
		page: pagination?.page ?? 1,
		pageSize: pagination?.limit ?? 0,
		rowCount: data.length,
		total,
		isFetching: isLoading || isFetching,
		isDisabled: !pagination || isError,
		setPage: pagination?.setPage ?? noop,
	});

	const isDataAbsent =
		!isLoading && !isFetching && !isError && data.length === 0;

	const handleRowClick = useCallback(
		(row: TracesTableRow): void => {
			if (onRowClick) {
				onRowClick(row);
				return;
			}
			navigate(getRowHref(row));
		},
		[onRowClick, navigate, getRowHref],
	);

	const handleRowClickNewTab = useCallback(
		(row: TracesTableRow): void => {
			window.open(getAbsoluteUrl(getRowHref(row)), '_blank', 'noopener');
		},
		[getRowHref],
	);

	return (
		<>
			{isError && error && <ErrorInPlace error={error as APIError} />}

			{(isLoading || (isFetching && data.length === 0)) && <TracesLoading />}

			{isDataAbsent && !isFilterApplied && (
				<NoLogs dataSource={DataSource.TRACES} />
			)}

			{isDataAbsent && isFilterApplied && (
				<EmptyLogsSearch dataSource={DataSource.TRACES} panelType={panelType} />
			)}

			{!isError && data.length !== 0 && (
				<div className={styles.tableWrapper}>
					<TanStackTable<TracesTableRow>
						data={data}
						columns={columns}
						className={styles.tracesTable}
						columnStorageKey={columnStorageKey}
						respectColumnOrder={respectColumnOrder}
						isLoading={isFetching}
						cellTypographySize={cellTypographySize}
						onColumnOrderChange={onColumnOrderChange}
						onColumnRemove={onColumnRemove}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
						isRowActive={isRowActive}
						activeRowIndex={activeRowIndex}
						getRowKey={getRowKey}
						getRowTestId={(row): string => `traces-table-row-${row.id}`}
						testId={`traces-table-${panelType.toLowerCase()}`}
						onEndReached={onEndReached}
						enableQueryParams={pagination ? TRACES_TABLE_QUERY_PARAMS : undefined}
						pagination={
							pagination && {
								total,
								defaultLimit: pagination.limit,
								showTotalCount: false,
								onLimitChange: pagination.setLimit,
							}
						}
					/>
				</div>
			)}
		</>
	);
}

TracesTable.defaultProps = {
	columnStorageKey: undefined,
	respectColumnOrder: false,
	onRowClick: undefined,
	isRowActive: undefined,
	activeRowIndex: undefined,
	onColumnOrderChange: undefined,
	onColumnRemove: undefined,
	cellTypographySize: 'medium',
	pagination: undefined,
	onEndReached: undefined,
};

export default TracesTable;
