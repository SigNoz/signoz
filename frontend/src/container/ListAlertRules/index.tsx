import { useCallback, useMemo } from 'react';
import { Plus, Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import ErrorEmptyState from 'components/Alerts/ErrorEmptyState';
import NoResultsEmptyState from 'components/Alerts/NoResultsEmptyState';
import TanStackTable from 'components/TanStackTableView';
import { useCalculatedPageSize } from 'components/TanStackTableView/useCalculatedPageSize';
import { useTableParams } from 'components/TanStackTableView/useTableParams';
import useComponentPermission from 'hooks/useComponentPermission';
import { useUrlSearchState } from 'hooks/useUrlSearchState';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';

import TextToolTip from 'components/TextToolTip';

import { AlertsEmptyState } from './AlertsEmptyState/AlertsEmptyState';
import { ActionsMenu, ColumnSelector } from './components';
import { ALERT_RULES_PARAMS, useAlertRulesFilters } from './hooks';
import styles from './ListAlertRules.module.scss';
import { getAlertRuleColumns } from './table.config';
import type { AlertRule } from './types';
import { useAlertRulesData } from './useAlertRulesData';
import { useAlertRulesHandlers } from './useAlertRulesHandlers';

const QUERY_PARAMS_CONFIG = {
	orderBy: 'orderBy',
	page: 'page',
	limit: 'limit',
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function ListAlertRules(): JSX.Element {
	const { user } = useAppContext();
	const [addNewAlert, action] = useComponentPermission(
		['add_new_alert', 'action'],
		user.role,
	);

	const [filterValues, setFilterValues] = useAlertRulesFilters();
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const { containerRef, calculatedPageSize } = useCalculatedPageSize({
		rowHeight: 46,
	});

	const { orderBy, page, limit, setLimit, setPage } = useTableParams(
		QUERY_PARAMS_CONFIG,
		{
			page: DEFAULT_PAGE,
			limit: DEFAULT_LIMIT,
			storageKey: 'alert-rules',
			calculatedPageSize,
			cleanupOnUnmount: true,
		},
	);

	const resetPageOnSearch = useCallback((): void => {
		setPage(1);
	}, [setPage]);

	const { searchText, debouncedSearch, handleSearchChange, clearSearch } =
		useUrlSearchState(ALERT_RULES_PARAMS.SEARCH, {
			onDebouncedChange: resetPageOnSearch,
		});

	const { filteredRules, isFetching, isError, allRules, refetch } =
		useAlertRulesData(orderBy, debouncedSearch, filterValues ?? []);

	const { handleEdit, handleNewAlert, handleRowClick, handleRowClickNewTab } =
		useAlertRulesHandlers(allRules.length);

	const handleClearFilters = useCallback((): void => {
		void setFilterValues(null);
		clearSearch();
	}, [setFilterValues, clearSearch]);

	const columns = useMemo(
		() => getAlertRuleColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	const paginatedRules = useMemo(() => {
		const start = (page - 1) * limit;
		return filteredRules.slice(start, start + limit);
	}, [filteredRules, page, limit]);

	const columnsWithActions = useMemo(() => {
		if (!action) {
			return columns;
		}

		return [
			...columns,
			{
				id: 'actions',
				header: (): JSX.Element => (
					<span style={{ textAlign: 'right', display: 'block' }}>Actions</span>
				),
				accessorKey: 'id',
				width: { fixed: '80px', ignoreLastColumnFill: true },
				enableSort: false,
				enableRemove: false,
				enableMove: false,
				pin: 'right' as const,
				cell: ({ row }: { row: AlertRule }): JSX.Element => (
					<div className={styles.actionsColumn}>
						<ActionsMenu rule={row} onEdit={handleEdit} />
					</div>
				),
			},
		];
	}, [action, columns, handleEdit]);

	const hasActiveFilters =
		searchText.length > 0 || (filterValues ?? []).length > 0;
	const isEmptyDueToFilters =
		!isFetching &&
		filteredRules.length === 0 &&
		hasActiveFilters &&
		allRules.length > 0;
	const isEmptyNoRules = !isFetching && !isError && allRules.length === 0;

	return (
		<div className={styles.container}>
			{!isEmptyNoRules && (
				<div className={styles.header}>
					<div className={styles.refreshRow}>
						<ColumnSelector columns={columns} storageKey="alert-rules-columns" />
						{addNewAlert && (
							<Button
								variant="solid"
								size="sm"
								prefix={<Plus size={14} />}
								onClick={handleNewAlert}
								color="primary"
							>
								New Alert
							</Button>
						)}
						<TextToolTip
							text="More details on how to create alerts"
							url="https://signoz.io/docs/alerts/?utm_source=product&utm_medium=list-alerts"
							urlText="Learn More"
						/>
					</div>
				</div>
			)}

			{!isEmptyNoRules && (
				<div className={styles.filtersRow}>
					<Input
						className={styles.searchInput}
						placeholder="Search by Alert Name, Severity and Labels"
						value={searchText}
						onChange={handleSearchChange}
						suffix={<Search size={14} className={styles.searchIcon} />}
					/>
				</div>
			)}

			<div ref={containerRef} className={styles.tableContainer}>
				{isError ? (
					<ErrorEmptyState title="Failed to load alert rules" onRefresh={refetch} />
				) : isEmptyDueToFilters ? (
					<NoResultsEmptyState
						title="No matching alert rules"
						subtitle="No alert rules match your search. Try adjusting your search criteria."
						onClear={handleClearFilters}
						clearButtonText="Clear Search"
					/>
				) : isEmptyNoRules ? (
					<AlertsEmptyState onRefresh={refetch} />
				) : (
					<TanStackTable<AlertRule>
						data={paginatedRules}
						columns={columnsWithActions}
						isLoading={isFetching}
						getRowKey={(row): string => row.id ?? ''}
						getItemKey={(row): string => row.id ?? ''}
						columnStorageKey="alert-rules-columns"
						enableQueryParams={QUERY_PARAMS_CONFIG}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
						pagination={{
							total: filteredRules.length,
							calculatedPageSize,
							onLimitChange: setLimit,
							showTotalCount: true,
						}}
						paginationClassname={styles.paginationContainer}
						enableAlternatingRowColors
						plainTextCellLineClamp={2}
					/>
				)}
			</div>
		</div>
	);
}

export default ListAlertRules;
