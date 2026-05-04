import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Button } from '@signozhq/ui';
import { Typography } from 'antd';
import TanStackTable, {
	SortState,
	TableColumnDef,
	TanStackTableStateProvider,
} from 'components/TanStackTableView';
import { CornerDownRight } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useGlobalTimeStore } from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

import { InfraMonitoringEntity } from '../constants';
import {
	useInfraMonitoringFiltersK8s,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
	useInfraMonitoringPageListing,
	useInfraMonitoringSelectedItem,
} from '../hooks';
import { K8sBaseFilters } from './types';

import styles from './K8sExpandedRow.module.scss';

const EXPANDED_ROW_LIMIT = 10;

export type K8sExpandedRowProps<T> = {
	/** Pre-computed row key from parent table (includes group prefix + duplicate handling) */
	rowKey: string;
	/** Group metadata for building filters */
	groupMeta?: Record<string, string>;
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
};

export function K8sExpandedRow<T>({
	rowKey,
	groupMeta,
	entity,
	tableColumns,
	fetchListData,
	getRowKey,
	getItemKey,
}: K8sExpandedRowProps<T>): JSX.Element {
	const [, setGroupBy] = useInfraMonitoringGroupBy();
	const [, setCurrentPage] = useInfraMonitoringPageListing();
	const [queryFilters, setFilters] = useInfraMonitoringFiltersK8s();
	const [, setSelectedItem] = useInfraMonitoringSelectedItem();
	const [, setMainOrderBy] = useInfraMonitoringOrderBy();

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

	const createFiltersForRecord = useCallback((): NonNullable<
		IBuilderQuery['filters']
	> => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [...(queryFilters?.items || [])],
			op: 'and',
		};

		const metaKeys = groupMeta ?? {};

		for (const key of Object.keys(metaKeys)) {
			const value = metaKeys[key];
			// Skip empty values to avoid creating invalid filters
			if (value === '' || value === undefined || value === null) {
				continue;
			}
			baseFilters.items.push({
				key: {
					key,
					type: 'resource',
				},
				op: '=',
				value,
				id: key,
			});
		}

		return baseFilters;
	}, [queryFilters?.items, groupMeta]);

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
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
		);
	}, [
		getAutoRefreshQueryKey,
		selectedTime,
		entity,
		groupMeta,
		rowKey,
		queryFilters,
		orderBy,
	]);

	const { data, isLoading, isError } = useQuery({
		queryKey,
		queryFn: async ({ signal }) => {
			const { minTime, maxTime } = getMinMaxTime();

			return await fetchListData(
				{
					limit: EXPANDED_ROW_LIMIT,
					offset: 0,
					filters: createFiltersForRecord(),
					start: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
					end: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
					orderBy: orderBy || undefined,
					groupBy: undefined,
				},
				signal,
			);
		},
		staleTime: 1000 * 60 * 30,
		refetchInterval: isRefreshEnabled ? refreshInterval : false,
	});

	const expandedData = data?.data ?? [];

	const handleRowClick = useCallback(
		(_row: T, itemKey: string): void => {
			setSelectedItem(itemKey);
		},
		[setSelectedItem],
	);

	const handleViewAllClick = (): void => {
		const filters = createFiltersForRecord();
		setGroupBy([]);
		setCurrentPage(1);
		setFilters(filters);
		if (orderBy) {
			setMainOrderBy(orderBy);
		}
	};

	const total = data?.total ?? 0;
	const hasMoreItems = total > EXPANDED_ROW_LIMIT;

	const footerContent = hasMoreItems ? (
		<Button
			type="button"
			color="secondary"
			variant="outlined"
			className={styles.viewAllButton}
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
					<TanStackTable<T>
						data={expandedData}
						columns={tableColumns}
						columnStorageKey={storageKey}
						isLoading={isLoading}
						getRowKey={getRowKey}
						getItemKey={getItemKey}
						onRowClick={handleRowClick}
						enableQueryParams={{
							orderBy: orderByParamKey,
						}}
						tableScrollerProps={{
							className: styles.expandedTable,
						}}
						disableVirtualScroll
						cellTypographySize="medium"
					/>
				</TanStackTableStateProvider>
				{!isLoading && expandedData.length > 0 && (
					<div className={styles.expandedTableFooter}>{footerContent}</div>
				)}
			</div>
		</div>
	);
}
