import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import TanStackTable, {
	TableColumnDef,
	useCalculatedPageSize,
	useHiddenColumnIds,
	useTableParams,
} from 'components/TanStackTableView';
import { InfraMonitoringEvents } from 'constants/events';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGlobalTimeStore } from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';
import { Querybuildertypesv5QueryWarnDataDTO } from 'api/generated/services/sigNoz.schemas';
import { openInNewTab } from 'utils/navigation';
import APIError from 'types/api/error';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import {
	SelectedItemParams,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
	useInfraMonitoringSelectedItemParams,
	useInfraMonitoringStatusFilter,
} from '../hooks';
import { useInfraMonitoringLineClamp } from '../components';
import { K8sEmptyState } from './K8sEmptyState';
import { K8sExpandedRow } from './K8sExpandedRow';
import K8sHeader from './K8sHeader';
import { K8sPaginationWarning } from './K8sPaginationWarning';
import { K8sBaseFilters } from './types';
import { getGroupedByMeta } from './utils';
import { K8sInstrumentationChecksCallout } from './components/K8sInstrumentationChecksCallout/K8sInstrumentationChecksCallout';

import styles from './K8sBaseList.module.scss';
import cx from 'classnames';

export type K8sBaseListEmptyStateContext = {
	isError: boolean;
	error?: APIError | null;
	totalCount: number;
	hasFilters: boolean;
	isLoading: boolean;
	endTimeBeforeRetention?: boolean;
	rawData?: unknown;
};

/** Base type constraint for K8s entity data */
export type K8sEntityData = { meta?: Record<string, string> | null };

export type K8sBaseListProps<
	T extends K8sEntityData,
	TItemKey extends string | SelectedItemParams = string,
> = {
	controlListPrefix?: React.ReactNode;
	leftFilters?: React.ReactNode;
	entity: InfraMonitoringEntity;
	tableColumns: TableColumnDef<T>[];
	fetchListData: (
		filters: K8sBaseFilters,
		signal?: AbortSignal,
	) => Promise<{
		type?: 'list' | 'grouped_list';
		records?: T[];
		data?: T[];
		total: number;
		error?: APIError | null;
		rawData?: unknown;
		endTimeBeforeRetention?: boolean;
		warning?: Querybuildertypesv5QueryWarnDataDTO | null;
	}>;
	/** Function to get the unique key for a row. */
	getRowKey: (record: T) => string;
	/** Function to get the item key used for selection. Can return string or SelectedItemParams. */
	getItemKey: (record: T) => TItemKey;
	eventCategory: InfraMonitoringEvents;
	renderEmptyState?: (
		context: K8sBaseListEmptyStateContext,
	) => React.ReactNode | null;
	extraQueryKeyParts?: string[];
	detailsQueryKeyPrefix: string;
};

export function K8sBaseList<
	T extends K8sEntityData,
	TItemKey extends string | SelectedItemParams = string,
>({
	controlListPrefix,
	leftFilters,
	entity,
	tableColumns,
	fetchListData,
	getRowKey,
	getItemKey,
	eventCategory,
	renderEmptyState,
	extraQueryKeyParts = [],
	detailsQueryKeyPrefix,
}: K8sBaseListProps<T, TItemKey>): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const expression = currentQuery.builder.queryData[0]?.filter?.expression || '';
	const lineClamp = useInfraMonitoringLineClamp();
	const [groupBy] = useInfraMonitoringGroupBy();
	const [orderBy] = useInfraMonitoringOrderBy();
	const [statusFilter] = useInfraMonitoringStatusFilter();
	const [selectedItemParams, setSelectedItemParams] =
		useInfraMonitoringSelectedItemParams();
	const selectedItem = selectedItemParams.selectedItem;

	const columnStorageKey = `k8s-${entity}-columns`;
	const hiddenColumnIds = useHiddenColumnIds(columnStorageKey);

	const { containerRef, calculatedPageSize } = useCalculatedPageSize({
		rowHeight: 42,
	});

	const {
		page: currentPage,
		limit: currentPageSize,
		setLimit,
	} = useTableParams(
		{
			page: INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE,
			limit: INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE_SIZE,
		},
		{
			page: 1,
			limit: 10,
			storageKey: `k8s-${entity}`,
			calculatedPageSize,
		},
	);

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
			expression || '',
			JSON.stringify(orderBy),
			JSON.stringify(groupBy),
			statusFilter,
			...extraQueryKeyParts,
		);
	}, [
		getAutoRefreshQueryKey,
		selectedTime,
		entity,
		currentPageSize,
		currentPage,
		expression,
		orderBy,
		groupBy,
		statusFilter,
		extraQueryKeyParts,
	]);

	const queryClient = useQueryClient();

	const { data, isLoading, isFetching, isError } = useQuery({
		queryKey,
		queryFn: async ({ signal }) => {
			const { minTime, maxTime } = getMinMaxTime();
			const start = Math.floor(minTime / NANO_SECOND_MULTIPLIER);
			const end = Math.floor(maxTime / NANO_SECOND_MULTIPLIER);

			const response = await fetchListData(
				{
					filter: {
						expression: expression || '',
						filterByStatus:
							statusFilter === 'active' || statusFilter === 'inactive'
								? statusFilter
								: undefined,
					},
					groupBy:
						groupBy && groupBy.length > 0
							? groupBy.map((g) => ({ name: g }))
							: undefined,
					offset: (currentPage - 1) * currentPageSize,
					limit: currentPageSize,
					start,
					end,
					orderBy: orderBy
						? { key: { name: orderBy.columnName }, direction: orderBy.order }
						: undefined,
				},
				signal,
			);
			return {
				data: response.records || response.data || [],
				total: response.total,
				error: response.error,
				endTimeBeforeRetention: response.endTimeBeforeRetention,
				rawData: response.rawData ?? response,
				warning: response.warning ?? null,
			};
		},
		refetchInterval: isRefreshEnabled ? refreshInterval : false,
	});

	const cancelQuery = useCallback((): void => {
		void queryClient.cancelQueries({ queryKey });
	}, [queryClient, queryKey]);

	const pageData = data?.data ?? [];
	const totalCount = data?.total || 0;
	const hasFilters = !!expression?.trim();

	const getGroupKeyFn = useCallback(
		(item: T) => getGroupedByMeta(item, groupBy),
		[groupBy],
	);

	useEffect(() => {
		void logEvent(InfraMonitoringEvents.PageVisited, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: eventCategory,
			total: totalCount,
		});
	}, [eventCategory, totalCount]);

	const handleRowClick = useCallback(
		(record: T, itemKey: TItemKey): void => {
			if (groupBy.length === 0) {
				const params: SelectedItemParams =
					typeof itemKey === 'object'
						? itemKey
						: {
								selectedItem: itemKey,
								clusterName: null,
								namespaceName: null,
							};

				if (detailsQueryKeyPrefix) {
					const detailQueryKey = getAutoRefreshQueryKey(
						selectedTime,
						`${detailsQueryKeyPrefix}EntityDetails`,
						params.selectedItem,
						params.clusterName,
						params.namespaceName,
					);
					queryClient.setQueryData(detailQueryKey, { data: record });
				}

				setSelectedItemParams(params);
			}

			void logEvent(InfraMonitoringEvents.ItemClicked, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: eventCategory,
			});
		},
		[
			eventCategory,
			groupBy.length,
			setSelectedItemParams,
			detailsQueryKeyPrefix,
			getAutoRefreshQueryKey,
			selectedTime,
			queryClient,
		],
	);

	const handleRowClickNewTab = useCallback(
		(_record: T, itemKey: TItemKey): void => {
			if (groupBy.length > 0) {
				return;
			}

			// Build URL with selectedItem params
			const url = new URL(window.location.href);
			if (typeof itemKey === 'object' && itemKey !== null) {
				const params = itemKey;
				if (params.selectedItem) {
					url.searchParams.set(
						INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM,
						params.selectedItem,
					);
				}
				if (params.clusterName) {
					url.searchParams.set(
						INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_CLUSTER_NAME,
						params.clusterName,
					);
				}
				if (params.namespaceName) {
					url.searchParams.set(
						INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_NAMESPACE_NAME,
						params.namespaceName,
					);
				}
			} else {
				url.searchParams.set(
					INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM,
					itemKey,
				);
			}
			openInNewTab(url.pathname + url.search);

			void logEvent(InfraMonitoringEvents.ItemClicked, {
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
			<K8sExpandedRow<T, TItemKey>
				rowKey={rowKey}
				groupMeta={groupMeta}
				entity={entity}
				tableColumns={expandedRowColumns}
				fetchListData={fetchListData}
				extraQueryKeyParts={extraQueryKeyParts}
				getRowKey={getRowKey}
				getItemKey={getItemKey}
			/>
		),
		[
			entity,
			fetchListData,
			getRowKey,
			getItemKey,
			expandedRowColumns,
			extraQueryKeyParts,
		],
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
		endTimeBeforeRetention: data?.endTimeBeforeRetention,
		rawData: data?.rawData,
	}) || (
		<K8sEmptyState
			isError={isError}
			error={data?.error}
			isLoading={showTableLoadingState}
			endTimeBeforeRetention={data?.endTimeBeforeRetention}
		/>
	);

	const showEmptyState = !showTableLoadingState && pageData.length === 0;

	const paginationWarningContent = data?.warning ? (
		<K8sPaginationWarning warning={data.warning} />
	) : null;

	return (
		<>
			<K8sHeader
				controlListPrefix={controlListPrefix}
				leftFilters={leftFilters}
				entity={entity}
				showAutoRefresh={!selectedItem}
				columns={tableColumns}
				columnStorageKey={columnStorageKey}
				isFetching={isFetching}
				cancelQuery={cancelQuery}
			/>
			<div ref={containerRef} className={styles.tableContainer}>
				<K8sInstrumentationChecksCallout entity={entity} />

				{isError && (
					<Typography>
						{data?.error?.toString() || 'Something went wrong'}
					</Typography>
				)}

				{showEmptyState ? (
					<div className={styles.emptyStateContainer}>{emptyTableMessage}</div>
				) : (
					<TanStackTable<T, TItemKey>
						data={pageData}
						columns={tableColumns}
						columnStorageKey={columnStorageKey}
						isLoading={showTableLoadingState}
						getRowKey={getRowKey}
						getItemKey={getItemKey}
						groupBy={groupBy.map((g) => ({ key: g }))}
						getGroupKey={getGroupKeyFn}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
						renderExpandedRow={isGroupedByAttribute ? renderExpandedRow : undefined}
						getRowCanExpand={isGroupedByAttribute ? getRowCanExpand : undefined}
						className={cx(styles.k8SListTable)}
						enableQueryParams={{
							page: INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE,
							limit: INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE_SIZE,
							orderBy: INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
							expanded: INFRA_MONITORING_K8S_PARAMS_KEYS.EXPANDED,
						}}
						pagination={{
							total: totalCount,
							showTotalCount: true,
							totalCountLabel: entity.charAt(0).toUpperCase() + entity.slice(1),
							calculatedPageSize,
							onLimitChange: setLimit,
						}}
						plainTextCellLineClamp={lineClamp}
						prefixPaginationContent={paginationWarningContent}
						paginationClassname={styles.paginationContainer}
					/>
				)}
			</div>
		</>
	);
}
