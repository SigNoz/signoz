import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useLocation } from 'react-router-dom';
import { Querybuildertypesv5QueryWarnDataDTO } from 'api/generated/services/sigNoz.schemas';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import APIError from 'types/api/error';
import TanStackTable, {
	SortState,
	TableColumnDef,
	TanStackTableStateProvider,
} from 'components/TanStackTableView';
import { CornerDownRight } from '@signozhq/icons';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { v4 as uuid } from 'uuid';
import { useQueryState } from 'nuqs';
import { useGlobalTimeStore } from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import {
	SelectedItemParams,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
	useInfraMonitoringPageListing,
	useInfraMonitoringSelectedItemParams,
} from '../hooks';
import { K8sBaseFilters } from './types';
import { useLogEventForColumnCustomized } from './useLogEventForColumnCustomized';
import { useInfraMonitoringFontSize } from './useInfraMonitoringTablePreferencesStore';

import styles from './K8sExpandedRow.module.scss';
import { buildExpressionFromGroupMeta } from './utils';
import { logInfraColumnSortedEvent } from 'container/InfraMonitoringK8sV2/Base/events';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';
import { QueryParams } from 'constants/query';

const EXPANDED_ROW_LIMIT = 10;

export type K8sExpandedRowProps<T, TItemKey = string> = {
	/** Pre-computed row key from parent table (includes group prefix + duplicate handling) */
	rowKey: string;
	/** Group metadata for building filters */
	groupMeta?: Record<string, string>;
	entity: InfraMonitoringEntity;
	tableColumns: TableColumnDef<T>[];
	/** API fetch function for expanded row data */
	fetchListData?: (
		filters: K8sBaseFilters,
		signal?: AbortSignal,
	) => Promise<{
		type?: 'list' | 'grouped_list';
		records?: T[];
		data?: T[];
		total: number;
		error?: APIError | null;
		rawData?: unknown;
		warning?: Querybuildertypesv5QueryWarnDataDTO | null;
	}>;
	/** Extra parts to include in the react-query cache key (e.g., status filter). */
	extraQueryKeyParts?: string[];
	/** Function to get the unique key for a row. */
	getRowKey?: (record: T) => string;
	/** Function to get the item key used for selection. Defaults to getRowKey if not provided. */
	getItemKey?: (record: T) => TItemKey;
	/** Query key prefix for pre-caching detail data on row click */
	detailsQueryKeyPrefix?: string;
};

export function K8sExpandedRow<
	T,
	TItemKey extends string | SelectedItemParams = string,
>({
	rowKey,
	groupMeta,
	entity,
	tableColumns,
	fetchListData,
	extraQueryKeyParts = [],
	getRowKey,
	getItemKey,
	detailsQueryKeyPrefix,
}: K8sExpandedRowProps<T, TItemKey>): JSX.Element {
	const fontSize = useInfraMonitoringFontSize();
	const [, setGroupBy] = useInfraMonitoringGroupBy();
	const [, setCurrentPage] = useInfraMonitoringPageListing();
	const { currentQuery } = useQueryBuilder();
	const parentExpression =
		currentQuery.builder.queryData[0]?.filter?.expression || '';
	const [, setSelectedItemParams] = useInfraMonitoringSelectedItemParams();
	const [, setMainOrderBy] = useInfraMonitoringOrderBy();
	const { safeNavigate } = useSafeNavigate();
	const location = useLocation();
	const queryClient = useQueryClient();

	const orderByParamKey = useMemo(
		() => `orderBy_${rowKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
		[rowKey],
	);
	const [orderBy, setOrderBy] = useQueryState(
		orderByParamKey,
		parseAsJsonNoValidate<SortState | null>()
			.withDefault(null as never)
			.withOptions({
				history: 'push',
			}),
	);
	useEffect(() => {
		return (): void => {
			void setOrderBy(null);
		};
	}, [setOrderBy]);

	const storageKey = `k8s-${entity}-columns-expanded`;

	useLogEventForColumnCustomized({
		entity,
		source: 'expanded',
		storageKey,
		columns: tableColumns,
	});

	const expressionForRecord = useMemo(
		() => buildExpressionFromGroupMeta(parentExpression || '', groupMeta),
		[parentExpression, groupMeta],
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
			entity,
			'k8sExpandedRow',
			JSON.stringify(groupMeta),
			rowKey,
			expressionForRecord,
			JSON.stringify(orderBy),
			...extraQueryKeyParts,
		);
	}, [
		getAutoRefreshQueryKey,
		selectedTime,
		entity,
		groupMeta,
		rowKey,
		expressionForRecord,
		orderBy,
		extraQueryKeyParts,
	]);

	const { data, isLoading, isError } = useQuery({
		queryKey,
		queryFn: async ({ signal }) => {
			if (!fetchListData) {
				return { data: [] as T[], total: 0 };
			}
			const { minTime, maxTime } = getMinMaxTime();

			const response = await fetchListData(
				{
					filter: { expression: expressionForRecord },
					limit: EXPANDED_ROW_LIMIT,
					offset: 0,
					start: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
					end: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
					orderBy: orderBy
						? { key: { name: orderBy.columnName }, direction: orderBy.order }
						: undefined,
					groupBy: undefined,
				},
				signal,
			);

			return {
				data: response.records || response.data || [],
				total: response.total,
				error: response.error,
			};
		},
		staleTime: 1000 * 60 * 30,
		refetchInterval: isRefreshEnabled ? refreshInterval : false,
		enabled: !!fetchListData,
	});

	const expandedData = data?.data ?? [];

	const handleRowClick = useCallback(
		(row: T, itemKey: TItemKey): void => {
			const params: SelectedItemParams =
				typeof itemKey === 'object' && itemKey !== null
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
					params.containerName,
				);
				queryClient.setQueryData(detailQueryKey, { data: row });
			}

			setSelectedItemParams(params);
		},
		[
			setSelectedItemParams,
			detailsQueryKeyPrefix,
			getAutoRefreshQueryKey,
			selectedTime,
			queryClient,
		],
	);

	const handleSort = useCallback(
		(sort: SortState | null): void => {
			if (sort) {
				logInfraColumnSortedEvent(entity, sort.columnName, sort.order, 'expanded');
			}
		},
		[entity],
	);

	const handleViewAllClick = (): void => {
		void setGroupBy([]);
		void setCurrentPage(1);
		if (orderBy) {
			void setMainOrderBy(orderBy);
		}

		const updatedQuery = {
			...currentQuery,
			id: uuid(),
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...(currentQuery.builder.queryData[0] || {}),
						filter: { expression: expressionForRecord },
						filters: { items: [], op: 'AND' as const },
					},
				],
			},
		};

		const searchParams = getUnstableCurrentSearchParams();

		searchParams.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify(updatedQuery)),
		);

		searchParams.delete(INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY);
		searchParams.delete(INFRA_MONITORING_K8S_PARAMS_KEYS.EXPANDED);
		searchParams.delete(orderByParamKey);
		searchParams.set(INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE, '1');

		if (orderBy) {
			searchParams.set(
				INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
				JSON.stringify(orderBy),
			);
		}

		safeNavigate(`${location.pathname}?${searchParams.toString()}`);
	};

	const total = data?.total ?? 0;
	const hasMoreItems = total > EXPANDED_ROW_LIMIT;

	const footerContent = hasMoreItems ? (
		<Button
			type="button"
			color="secondary"
			variant="outlined"
			className={styles.viewAllButton}
			data-testid="expanded-row-view-all"
			onClick={handleViewAllClick}
			prefix={<CornerDownRight size={14} />}
		>
			View All
		</Button>
	) : null;

	return (
		<div
			className={styles.expandedTableContainer}
			data-testid="expanded-table-container"
		>
			{isError && (
				<Typography>{data?.error?.toString() || 'Something went wrong'}</Typography>
			)}

			<div data-testid="expanded-table">
				<TanStackTableStateProvider>
					<TanStackTable<T, TItemKey>
						data={expandedData}
						columns={tableColumns}
						columnStorageKey={storageKey}
						isLoading={isLoading}
						getRowKey={getRowKey}
						getItemKey={getItemKey}
						onRowClick={handleRowClick}
						onSort={handleSort}
						enableQueryParams={{
							orderBy: orderByParamKey,
						}}
						tableScrollerProps={{
							className: styles.expandedTable,
						}}
						disableVirtualScroll
						cellTypographySize={fontSize}
					/>
				</TanStackTableStateProvider>
				{!isLoading && expandedData.length > 0 && (
					<div className={styles.expandedTableFooter}>{footerContent}</div>
				)}
			</div>
		</div>
	);
}
