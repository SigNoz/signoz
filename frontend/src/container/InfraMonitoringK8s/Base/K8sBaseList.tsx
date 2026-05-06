import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import TanStackTable, {
	TableColumnDef,
	useHiddenColumnIds,
} from 'components/TanStackTableView';
import { InfraMonitoringEvents } from 'constants/events';
import { parseAsString, useQueryState } from 'nuqs';
import { useGlobalTimeStore } from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';
import { openInNewTab } from 'utils/navigation';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import {
	useInfraMonitoringFiltersK8s,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
	useInfraMonitoringPageListing,
	useInfraMonitoringPageSizeListing,
} from '../hooks';
import { K8sEmptyState } from './K8sEmptyState';
import { K8sExpandedRow } from './K8sExpandedRow';
import K8sHeader from './K8sHeader';
import { K8sBaseFilters } from './types';
import { getGroupedByMeta } from './utils';

import styles from './K8sBaseList.module.scss';
import cx from 'classnames';

export type K8sBaseListEmptyStateContext = {
	isError: boolean;
	error?: string | null;
	totalCount: number;
	hasFilters: boolean;
	isLoading: boolean;
	rawData?: unknown;
};

/** Base type constraint for K8s entity data */
export type K8sEntityData = { meta?: Record<string, string> };

export type K8sBaseListProps<T extends K8sEntityData> = {
	controlListPrefix?: React.ReactNode;
	entity: InfraMonitoringEntity;
	tableColumns: TableColumnDef<T>[];
	fetchListData: (
		filters: K8sBaseFilters,
		signal?: AbortSignal,
	) => Promise<{
		data: T[];
		total: number;
		error?: string | null;
		rawData?: unknown;
	}>;
	/** Function to get the unique key for a row. */
	getRowKey?: (record: T) => string;
	/** Function to get the item key used for selection. Defaults to getRowKey if not provided. */
	getItemKey?: (record: T) => string;
	eventCategory: InfraMonitoringEvents;
	renderEmptyState?: (
		context: K8sBaseListEmptyStateContext,
	) => React.ReactNode | null;
};

export function K8sBaseList<T extends K8sEntityData>({
	controlListPrefix,
	entity,
	tableColumns,
	fetchListData,
	getRowKey,
	getItemKey,
	eventCategory,
	renderEmptyState,
}: K8sBaseListProps<T>): JSX.Element {
	const [queryFilters] = useInfraMonitoringFiltersK8s();
	const [currentPage] = useInfraMonitoringPageListing();
	const [currentPageSize] = useInfraMonitoringPageSizeListing();
	const [groupBy] = useInfraMonitoringGroupBy();
	const [orderBy] = useInfraMonitoringOrderBy();
	const [selectedItem, setSelectedItem] = useQueryState(
		'selectedItem',
		parseAsString,
	);

	const columnStorageKey = `k8s-${entity}-columns`;
	const hiddenColumnIds = useHiddenColumnIds(columnStorageKey);

	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const refreshInterval = useGlobalTimeStore((s) => s.refreshInterval);
	const isRefreshEnabled = useGlobalTimeStore((s) => s.isRefreshEnabled);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);
	const getAutoRefreshQueryKey = useGlobalTimeStore(
		(s) => s.getAutoRefreshQueryKey,
	);

	const queryKey = useMemo(() => {
		return getAutoRefreshQueryKey(
			selectedTime,
			'k8sBaseList',
			entity,
			String(currentPageSize),
			String(currentPage),
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
			JSON.stringify(groupBy),
		);
	}, [
		getAutoRefreshQueryKey,
		selectedTime,
		entity,
		currentPageSize,
		currentPage,
		queryFilters,
		orderBy,
		groupBy,
	]);

	const { data, isLoading, isError } = useQuery({
		queryKey,
		queryFn: ({ signal }) => {
			const { minTime, maxTime } = getMinMaxTime();

			return fetchListData(
				{
					limit: currentPageSize,
					offset: (currentPage - 1) * currentPageSize,
					filters: queryFilters || { items: [], op: 'AND' },
					start: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
					end: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
					orderBy: orderBy || undefined,
					groupBy: groupBy?.length > 0 ? groupBy : undefined,
				},
				signal,
			);
		},
		refetchInterval: isRefreshEnabled ? refreshInterval : false,
	});

	const pageData = data?.data ?? [];
	const totalCount = data?.total || 0;
	const hasFilters = (queryFilters?.items?.length ?? 0) > 0;

	const getGroupKeyFn = useCallback(
		(item: T) => getGroupedByMeta(item, groupBy),
		[groupBy],
	);

	useEffect(() => {
		logEvent(InfraMonitoringEvents.PageVisited, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: eventCategory,
			total: totalCount,
		});
	}, [eventCategory, totalCount]);

	const handleRowClick = useCallback(
		(_record: T, itemKey: string): void => {
			if (groupBy.length === 0) {
				setSelectedItem(itemKey);
			}

			logEvent(InfraMonitoringEvents.ItemClicked, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: eventCategory,
			});
		},
		[eventCategory, groupBy.length, setSelectedItem],
	);

	const handleRowClickNewTab = useCallback(
		(_record: T, itemKey: string): void => {
			if (groupBy.length > 0) {
				return;
			}

			// Build URL with selectedItem param
			const url = new URL(window.location.href);
			url.searchParams.set('selectedItem', itemKey);
			openInNewTab(url.pathname + url.search);

			logEvent(InfraMonitoringEvents.ItemClicked, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: eventCategory,
			});
		},
		[eventCategory, groupBy.length],
	);

	const isGroupedByAttribute = groupBy.length > 0;

	// Filter columns for expanded row based on parent's hidden columns
	const expandedRowColumns = useMemo(
		() => tableColumns.filter((col) => !hiddenColumnIds.includes(col.id)),
		[tableColumns, hiddenColumnIds],
	);

	const renderExpandedRow = useCallback(
		(
			_record: T,
			rowKey: string,
			groupMeta?: Record<string, string>,
		): JSX.Element => (
			<K8sExpandedRow<T>
				rowKey={rowKey}
				groupMeta={groupMeta}
				entity={entity}
				tableColumns={expandedRowColumns}
				fetchListData={fetchListData}
				getRowKey={getRowKey}
				getItemKey={getItemKey}
			/>
		),
		[entity, fetchListData, getRowKey, getItemKey, expandedRowColumns],
	);

	const getRowCanExpand = useCallback(
		(): boolean => isGroupedByAttribute,
		[isGroupedByAttribute],
	);

	const showTableLoadingState = isLoading;

	const emptyTableMessage: React.ReactNode = renderEmptyState?.({
		isError,
		error: data?.error,
		totalCount,
		hasFilters,
		isLoading: showTableLoadingState,
		rawData: data?.rawData,
	}) || (
		<K8sEmptyState
			isError={isError}
			error={data?.error}
			isLoading={showTableLoadingState}
			rawData={data?.rawData}
		/>
	);

	const showEmptyState = !showTableLoadingState && pageData.length === 0;

	return (
		<>
			<K8sHeader
				controlListPrefix={controlListPrefix}
				entity={entity}
				showAutoRefresh={!selectedItem}
				columns={tableColumns}
				columnStorageKey={columnStorageKey}
			/>
			{isError && (
				<Typography>{data?.error?.toString() || 'Something went wrong'}</Typography>
			)}

			{showEmptyState ? (
				<div className={styles.emptyStateContainer}>{emptyTableMessage}</div>
			) : (
				<TanStackTable<T>
					data={pageData}
					columns={tableColumns}
					columnStorageKey={columnStorageKey}
					isLoading={showTableLoadingState}
					getRowKey={getRowKey}
					getItemKey={getItemKey}
					groupBy={groupBy}
					getGroupKey={getGroupKeyFn}
					onRowClick={handleRowClick}
					onRowClickNewTab={handleRowClickNewTab}
					renderExpandedRow={isGroupedByAttribute ? renderExpandedRow : undefined}
					getRowCanExpand={isGroupedByAttribute ? getRowCanExpand : undefined}
					className={cx(styles.k8SListTable, expandedRowColumns)}
					enableQueryParams={{
						page: INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE,
						limit: INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE_SIZE,
						orderBy: INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
						expanded: INFRA_MONITORING_K8S_PARAMS_KEYS.EXPANDED,
					}}
					pagination={{
						total: totalCount,
						defaultLimit: 10,
						defaultPage: 1,
						showTotalCount: true,
						totalCountLabel: entity.charAt(0).toUpperCase() + entity.slice(1),
					}}
					paginationClassname={styles.paginationContainer}
				/>
			)}
		</>
	);
}
