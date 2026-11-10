import { useMemo } from 'react';
import ErrorEmptyState from 'components/Alerts/ErrorEmptyState';
import NoResultsEmptyState from 'components/Alerts/NoResultsEmptyState';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';

import styles from './PlannedDowntime.module.scss';
import PlannedDowntimeActionsMenu from './PlannedDowntimeActionsMenu';
import PlannedDowntimeEmptyState from './PlannedDowntimeEmptyState';
import { DowntimeSchedulesTableData, PlannedDowntimeListProps } from './types';
import { PLANNED_DOWNTIME_QUERY_PARAMS } from './usePlannedDowntimeTable';

function PlannedDowntimeList({
	columns,
	downtimes,
	pagedDowntimes,
	calculatedPageSize,
	onLimitChange,
	isFetching,
	isError,
	refetch,
	canEdit,
	onEdit,
	onDelete,
	onCreate,
	hasSearchTerm,
	onClearSearch,
}: PlannedDowntimeListProps): JSX.Element {
	const columnsWithActions =
		useMemo((): TableColumnDef<DowntimeSchedulesTableData>[] => {
			if (!canEdit) {
				return columns;
			}

			return [
				...columns,
				{
					id: 'actions',
					header: (): JSX.Element => (
						<span className={styles.actionsHeader}>Actions</span>
					),
					accessorKey: 'id',
					width: { fixed: '96px', ignoreLastColumnFill: true },
					enableSort: false,
					enableResize: false,
					enableRemove: false,
					enableMove: false,
					pin: 'right',
					cell: ({ row }): JSX.Element => (
						<PlannedDowntimeActionsMenu
							downtime={row}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					),
				},
			];
		}, [canEdit, columns, onEdit, onDelete]);

	const isEmpty = !isFetching && downtimes.length === 0;

	if (isError) {
		return (
			<ErrorEmptyState
				title="Failed to load planned downtime"
				onRefresh={refetch}
			/>
		);
	}

	if (isEmpty && hasSearchTerm) {
		return (
			<NoResultsEmptyState
				title="No matching planned downtime"
				subtitle="No planned downtime matches your search. Try adjusting your search criteria."
				onClear={onClearSearch}
				clearButtonText="Clear Search"
			/>
		);
	}

	if (isEmpty) {
		return <PlannedDowntimeEmptyState canCreate={canEdit} onCreate={onCreate} />;
	}

	return (
		<TanStackTable<DowntimeSchedulesTableData>
			data={pagedDowntimes}
			columns={columnsWithActions}
			isLoading={isFetching}
			getRowKey={(row): string => row.id}
			getItemKey={(row): string => row.id}
			getRowTestId={(row): string => `downtime-row-${row.id}`}
			columnStorageKey="planned-downtime-columns"
			enableQueryParams={PLANNED_DOWNTIME_QUERY_PARAMS}
			onRowClick={canEdit ? onEdit : undefined}
			pagination={{
				total: downtimes.length,
				calculatedPageSize,
				onLimitChange,
				showTotalCount: true,
			}}
			paginationClassname={styles.paginationContainer}
			enableAlternatingRowColors
			plainTextCellLineClamp={1}
		/>
	);
}

export default PlannedDowntimeList;
