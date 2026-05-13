import { useCallback, useMemo } from 'react';
import { Plus, Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import TanStackTable from 'components/TanStackTableView';
import { useTableParams } from 'components/TanStackTableView/useTableParams';
import useComponentPermission from 'hooks/useComponentPermission';
import { useUrlSearchState } from 'hooks/useUrlSearchState';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';

import { ActionsMenu, ColumnSelector, EmptyState } from './components';
import { ALERT_RULES_PARAMS, useAlertRulesFilters } from './hooks';
import styles from './ListAlertRules.module.scss';
import { getAlertRuleColumns } from './table.config';
import type { AlertRule } from './types';
import { useAlertRulesData } from './useAlertRulesData';
import { useAlertRulesHandlers } from './useAlertRulesHandlers';

const QUERY_PARAMS_CONFIG = { orderBy: 'alert_rules_order_by' } as const;

function ListAlertRules(): JSX.Element {
	const { user } = useAppContext();
	const [addNewAlert, action] = useComponentPermission(
		['add_new_alert', 'action'],
		user.role,
	);

	const [filterValues, setFilterValues] = useAlertRulesFilters();
	const { searchText, debouncedSearch, handleSearchChange, clearSearch } =
		useUrlSearchState(ALERT_RULES_PARAMS.SEARCH);
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const { orderBy } = useTableParams(QUERY_PARAMS_CONFIG);

	const { filteredRules, isFetching, isError, allRules } = useAlertRulesData(
		orderBy,
		debouncedSearch,
		filterValues ?? [],
	);

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

	const columnsWithActions = useMemo(() => {
		if (!action) {
			return columns;
		}

		return [
			...columns,
			{
				id: 'actions',
				header: '',
				accessorKey: 'id',
				width: { min: 50, default: 50 },
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

			<div className={styles.tableContainer}>
				{isError ? (
					<EmptyState variant="error" />
				) : isEmptyNoRules ? (
					<EmptyState />
				) : isEmptyDueToFilters ? (
					<EmptyState
						variant="no-search-results"
						onClearSearch={handleClearFilters}
					/>
				) : (
					<TanStackTable<AlertRule>
						data={filteredRules}
						columns={columnsWithActions}
						isLoading={isFetching}
						getRowKey={(row): string => row.id ?? ''}
						getItemKey={(row): string => row.id ?? ''}
						columnStorageKey="alert-rules-columns"
						enableQueryParams={QUERY_PARAMS_CONFIG}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
					/>
				)}
			</div>
		</div>
	);
}

export default ListAlertRules;
