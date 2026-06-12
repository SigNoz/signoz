import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { TracesLoading } from 'container/TracesExplorer/TraceLoading/TraceLoading';
import APIError from 'types/api/error';
import { DataSource } from 'types/common/queryBuilder';
import { getAbsoluteUrl } from 'utils/basePath';

import styles from './TracesTable.module.scss';

export type TracesTablePanelType = 'LIST' | 'TRACE';

export type TracesTableProps<TRow> = {
	data: TRow[];
	columns: TableColumnDef<TRow>[];

	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: APIError | Error | null;
	isFilterApplied: boolean;
	panelType: TracesTablePanelType;

	columnStorageKey: string;
	respectColumnOrder?: boolean;
	cellTypographySize?: 'small' | 'medium' | 'large';

	onColumnOrderChange?: (cols: TableColumnDef<TRow>[]) => void;
	onColumnRemove?: (id: string) => void;

	/** Build the href for a row. Wrapper handles same-tab navigation + cmd-click new-tab dispatch. */
	getRowHref: (row: TRow) => string;

	onEndReached: () => void;
};

export function TracesTable<TRow>({
	data,
	columns,
	isLoading,
	isFetching,
	isError,
	error,
	isFilterApplied,
	panelType,
	columnStorageKey,
	respectColumnOrder,
	cellTypographySize = 'medium',
	onColumnOrderChange,
	onColumnRemove,
	getRowHref,
	onEndReached,
}: TracesTableProps<TRow>): JSX.Element {
	const history = useHistory();
	const isEmpty = data.length === 0;
	const isInitialLoading = (isLoading || isFetching) && isEmpty;

	const onRowClick = useCallback(
		(row: TRow): void => {
			history.push(getRowHref(row));
		},
		[history, getRowHref],
	);

	const onRowClickNewTab = useCallback(
		(row: TRow): void => {
			window.open(
				getAbsoluteUrl(getRowHref(row)),
				'_blank',
				'noopener,noreferrer',
			);
		},
		[getRowHref],
	);

	return (
		<div className={styles.container}>
			{isError && error && <ErrorInPlace error={error as APIError} />}

			{isInitialLoading && <TracesLoading />}

			{!isLoading && !isFetching && !isError && !isFilterApplied && isEmpty && (
				<NoLogs dataSource={DataSource.TRACES} />
			)}

			{!isLoading && !isFetching && isEmpty && !isError && isFilterApplied && (
				<EmptyLogsSearch dataSource={DataSource.TRACES} panelType={panelType} />
			)}

			{!isEmpty && (
				<div className={styles.tableWrapper}>
					<TanStackTable<TRow>
						data={data}
						columns={columns}
						columnStorageKey={columnStorageKey}
						respectColumnOrder={respectColumnOrder}
						cellTypographySize={cellTypographySize}
						isLoading={isLoading || isFetching}
						onEndReached={onEndReached}
						onColumnOrderChange={onColumnOrderChange}
						onColumnRemove={onColumnRemove}
						onRowClick={onRowClick}
						onRowClickNewTab={onRowClickNewTab}
					/>
				</div>
			)}
		</div>
	);
}
