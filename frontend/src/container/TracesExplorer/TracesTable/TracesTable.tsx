import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import TanStackTable from 'components/TanStackTableView';
import type {
	CellTypographySize,
	TableColumnDef,
} from 'components/TanStackTableView/types';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { TracesLoading } from 'container/TracesExplorer/TraceLoading/TraceLoading';
import APIError from 'types/api/error';
import { DataSource, PanelTypeKeys } from 'types/common/queryBuilder';
import { getAbsoluteUrl } from 'utils/basePath';

import type { TracesTableRow } from './getFieldColumn';
import styles from './TracesTable.module.scss';

export type TracesTableProps = {
	data: TracesTableRow[];
	columns: TableColumnDef<TracesTableRow>[];
	columnStorageKey: string;
	panelType: PanelTypeKeys;
	/** Builds the trace-detail href for a row; drives row click + cmd/ctrl-click. */
	getRowHref: (row: TracesTableRow) => string;
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: APIError | Error | null;
	isFilterApplied: boolean;
	onColumnOrderChange?: (cols: TableColumnDef<TracesTableRow>[]) => void;
	onColumnRemove?: (columnId: string) => void;
	cellTypographySize?: CellTypographySize;
};

function TracesTable({
	data,
	columns,
	columnStorageKey,
	panelType,
	getRowHref,
	isLoading,
	isFetching,
	isError,
	error,
	isFilterApplied,
	onColumnOrderChange,
	onColumnRemove,
	cellTypographySize = 'medium',
}: TracesTableProps): JSX.Element {
	const history = useHistory();

	const isDataAbsent =
		!isLoading && !isFetching && !isError && data.length === 0;

	const handleRowClick = useCallback(
		(row: TracesTableRow): void => {
			history.push(getRowHref(row));
		},
		[history, getRowHref],
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
						respectColumnOrder={false}
						isLoading={isFetching}
						cellTypographySize={cellTypographySize}
						onColumnOrderChange={onColumnOrderChange}
						onColumnRemove={onColumnRemove}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
						getRowTestId={(row): string => `traces-table-row-${row.id}`}
					/>
				</div>
			)}
		</>
	);
}

TracesTable.defaultProps = {
	onColumnOrderChange: undefined,
	onColumnRemove: undefined,
	cellTypographySize: 'medium',
};

export default TracesTable;
