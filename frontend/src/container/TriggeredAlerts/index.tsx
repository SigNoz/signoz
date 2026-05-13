import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { Search } from '@signozhq/icons';
import { Input } from '@signozhq/ui/input';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import type { StatCardClickEvent } from 'components/Alerts';
import { NoResultsEmptyState } from 'components/Alerts';
import type { FilterValue } from 'components/Alerts';
import TanStackTable from 'components/TanStackTableView';
import { useTableParams } from 'components/TanStackTableView/useTableParams';
import { useUrlSearchState } from 'hooks/useUrlSearchState';
import { useTimezone } from 'providers/Timezone';

import { EmptyState, ExpandedAlertsTable, StatsRow } from './components';

import {
	TRIGGERED_ALERTS_PARAMS,
	useTriggeredAlertsFilters,
	useTriggeredAlertsGroupBy,
} from './hooks';
import { getAlertColumns, groupedColumns } from './table.config';
import styles from './TriggeredAlerts.module.scss';
import type { Alert, GroupedAlert } from './types';
import { useTriggeredAlertsData } from './useTriggeredAlertsData';
import { useTriggeredAlertsHandlers } from './useTriggeredAlertsHandlers';

const QUERY_PARAMS_CONFIG = { orderBy: 'triggered_alerts_order_by' } as const;

const severyFilters: ComboboxSimpleItem[] = [
	{
		value: 'severity:critical',
		label: 'Critical (severity:critical)',
		displayValue: 'Critical',
	},
	{
		value: 'severity:error',
		label: 'Error (severity:error)',
		displayValue: 'Error',
	},
	{
		value: 'severity:warning',
		label: 'Warning (severity:warning)',
		displayValue: 'Warning',
	},
	{
		value: 'severity:info',
		label: 'Info (severity:info)',
		displayValue: 'Info',
	},
];

function TriggeredAlerts(): JSX.Element {
	const [filterValues, setFilterValues] = useTriggeredAlertsFilters();
	const [selectedGroupBy, setSelectedGroupBy] = useTriggeredAlertsGroupBy();
	const { searchText, debouncedSearch, handleSearchChange, clearSearch } =
		useUrlSearchState(TRIGGERED_ALERTS_PARAMS.SEARCH);
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const { orderBy } = useTableParams(QUERY_PARAMS_CONFIG);

	const selectedFilter = useMemo(
		(): FilterValue[] => (filterValues ?? []).map((v: string) => ({ value: v })),
		[filterValues],
	);

	const {
		filteredAlerts,
		groupedData,
		uniqueLabels,
		isFetching,
		isError,
		isGrouped,
		stats,
	} = useTriggeredAlertsData(
		selectedFilter,
		selectedGroupBy,
		orderBy,
		debouncedSearch,
	);

	const handleFilterChange = useCallback(
		(values: unknown): void => {
			if (Array.isArray(values)) {
				void setFilterValues(values.length ? values : null);
			}
		},
		[setFilterValues],
	);

	const handleSeverityClick = useCallback(
		(severity: string, event: StatCardClickEvent): void => {
			const filterKey = `severity:${severity}`;
			void setFilterValues((prev: string[]) => {
				const current = prev ?? [];
				if (event.exclusive) {
					// Alt+click: toggle exclusive selection
					const isOnlyFilter = current.length === 1 && current[0] === filterKey;
					return isOnlyFilter ? null : [filterKey];
				}
				// Normal click: toggle filter
				if (current.includes(filterKey)) {
					const next = current.filter((v: string) => v !== filterKey);
					return next.length ? next : null;
				}
				return [...current, filterKey];
			});
		},
		[setFilterValues],
	);

	const handleTotalClick = useCallback(
		(_event: StatCardClickEvent): void => {
			void setFilterValues((prev: string[]) => {
				const current = prev ?? [];
				const withoutSeverity = current.filter(
					(v: string) => !v.startsWith('severity:'),
				);
				return withoutSeverity.length ? withoutSeverity : null;
			});
		},
		[setFilterValues],
	);

	const { handleGroupByChange, handleRowClick, handleRowClickNewTab } =
		useTriggeredAlertsHandlers(setSelectedGroupBy);

	const columns = useMemo(
		() => getAlertColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	const labelOptions: ComboboxSimpleItem[] = uniqueLabels.map((label) => ({
		value: label,
		label,
	}));

	const renderExpandedRow = useCallback(
		(group: GroupedAlert): ReactNode => (
			<ExpandedAlertsTable
				alerts={group.alerts}
				columns={columns}
				onRowClick={handleRowClick}
				onRowClickNewTab={handleRowClickNewTab}
				isLoading={isFetching}
			/>
		),
		[columns, handleRowClick, handleRowClickNewTab, isFetching],
	);

	const hasActiveFilters = selectedFilter.length > 0 || searchText.length > 0;
	const isEmptyDueToFilters =
		!isFetching &&
		filteredAlerts.length === 0 &&
		hasActiveFilters &&
		stats.total > 0;
	const isEmptyNoAlerts = !isFetching && !isError && stats.total === 0;

	const handleClearFilters = useCallback((): void => {
		void setFilterValues(null);
		clearSearch();
	}, [setFilterValues, clearSearch]);

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<StatsRow
					stats={stats}
					selectedFilters={filterValues ?? []}
					onSeverityClick={handleSeverityClick}
					onTotalClick={handleTotalClick}
				/>
			</div>

			<div className={styles.filtersRow}>
				<Input
					className={styles.searchInput}
					placeholder="Search alerts by name"
					value={searchText}
					onChange={handleSearchChange}
					suffix={<Search size={14} className={styles.searchIcon} />}
				/>
				<ComboboxSimple
					className={styles.filterSelect}
					multiple
					value={selectedFilter.map((f) => f.value)}
					onChange={handleFilterChange}
					placeholder="Filter by tags"
					inputPlaceholder="Create new filters with 'label:value'"
					allowCreate
					items={severyFilters}
					maxDisplayedPills={2}
				/>
				<ComboboxSimple
					className={styles.filterSelect}
					value={selectedGroupBy}
					onChange={handleGroupByChange}
					placeholder="Group by tag"
					inputPlaceholder="Select one or more"
					items={labelOptions}
					multiple
					maxDisplayedPills={2}
				/>
			</div>

			<div className={styles.tableContainer}>
				{isError ? (
					<NoResultsEmptyState
						title="Failed to load alerts"
						subtitle="Something went wrong while loading alerts. Please try again later."
					/>
				) : isEmptyNoAlerts ? (
					<EmptyState />
				) : isEmptyDueToFilters ? (
					<NoResultsEmptyState
						title="No matching alerts"
						subtitle="No alerts match your current filters. Try adjusting your search criteria."
						onClear={handleClearFilters}
					/>
				) : isGrouped ? (
					<TanStackTable<GroupedAlert>
						data={groupedData}
						columns={groupedColumns}
						isLoading={isFetching}
						getRowKey={(row): string => row.groupKey}
						getItemKey={(row): string => row.groupKey}
						renderExpandedRow={renderExpandedRow}
						getRowCanExpand={(): boolean => true}
						columnStorageKey="triggered-alerts-grouped-columns"
						enableQueryParams={QUERY_PARAMS_CONFIG}
					/>
				) : (
					<TanStackTable<Alert>
						data={filteredAlerts}
						columns={columns}
						isLoading={isFetching}
						getRowKey={(row): string => row.fingerprint ?? ''}
						getItemKey={(row): string => row.fingerprint ?? ''}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
						columnStorageKey="triggered-alerts-columns"
						enableQueryParams={QUERY_PARAMS_CONFIG}
					/>
				)}
			</div>
		</div>
	);
}

export default TriggeredAlerts;
