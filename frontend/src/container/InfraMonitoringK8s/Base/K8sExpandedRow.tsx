import React, { useCallback, useMemo } from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { LoadingOutlined } from '@ant-design/icons';
import {
	Button,
	Spin,
	Table,
	TableColumnType as ColumnType,
	Typography,
} from 'antd';
import { CornerDownRight } from 'lucide-react';
import { useGlobalTimeStore } from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { buildAbsolutePath, isModifierKeyPressed } from 'utils/app';
import { openInNewTab } from 'utils/navigation';

import { InfraMonitoringEntity } from '../constants';
import {
	useInfraMonitoringCurrentPage,
	useInfraMonitoringFilters,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
	useInfraMonitoringSelectedItem,
} from '../hooks';
import LoadingContainer from '../LoadingContainer';
import { K8sBaseFilters, K8sRenderedRowData } from './types';
import { useInfraMonitoringTableColumnsForPage } from './useInfraMonitoringTableColumnsStore';

import styles from './K8sExpandedRow.module.scss';

export type K8sExpandedRowProps<T> = {
	record: K8sRenderedRowData;
	entity: InfraMonitoringEntity;
	tableColumns: ColumnType<K8sRenderedRowData>[];
	fetchListData: (
		filters: K8sBaseFilters,
		signal?: AbortSignal,
	) => Promise<{
		data: T[];
		total: number;
		error?: string | null;
		rawData?: unknown;
	}>;
	renderRowData: (
		record: T,
		groupBy: BaseAutocompleteData[],
	) => K8sRenderedRowData;
};

export const MAX_ITEMS_TO_FETCH_WHEN_GROUP_BY = 10;

export function K8sExpandedRow<T>({
	record,
	entity,
	tableColumns,
	fetchListData,
	renderRowData,
}: K8sExpandedRowProps<T>): JSX.Element {
	const [groupBy, setGroupBy] = useInfraMonitoringGroupBy();
	const [orderBy, setOrderBy] = useInfraMonitoringOrderBy();
	const [, setCurrentPage] = useInfraMonitoringCurrentPage();
	const [queryFilters, setFilters] = useInfraMonitoringFilters();
	const [, setSelectedItem] = useInfraMonitoringSelectedItem();

	const [columnsDefinitions, columnsHidden] =
		useInfraMonitoringTableColumnsForPage(entity);

	const hiddenColumnIdsForNested = useMemo(
		() =>
			columnsDefinitions
				.filter((col) => col.behavior === 'hidden-on-collapse')
				.map((col) => col.id),
		[columnsDefinitions],
	);

	const nestedColumns = useMemo(
		() =>
			tableColumns.filter(
				(c) =>
					!columnsHidden.includes(c.key?.toString() || '') &&
					!hiddenColumnIdsForNested.includes(c.key?.toString() || ''),
			),
		[tableColumns, columnsHidden, hiddenColumnIdsForNested],
	);

	const createFiltersForRecord = useCallback((): NonNullable<
		IBuilderQuery['filters']
	> => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [...(queryFilters?.items || [])],
			op: 'and',
		};

		const { groupedByMeta } = record;

		for (const key of Object.keys(groupedByMeta)) {
			baseFilters.items.push({
				key: {
					key,
					type: null,
				},
				op: '=',
				value: groupedByMeta[key],
				id: key,
			});
		}

		return baseFilters;
	}, [queryFilters?.items, record]);

	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const refreshInterval = useGlobalTimeStore((s) => s.refreshInterval);
	const isRefreshEnabled = useGlobalTimeStore((s) => s.isRefreshEnabled);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);
	const getAutoRefreshQueryKey = useGlobalTimeStore(
		(s) => s.getAutoRefreshQueryKey,
	);

	const queryKey = useMemo(() => {
		return getAutoRefreshQueryKey(selectedTime, [
			'k8sExpandedRow',
			record.key,
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
		]);
	}, [getAutoRefreshQueryKey, selectedTime, record.key, queryFilters, orderBy]);

	const { data, isFetching, isLoading, isError } = useQuery({
		queryKey,
		queryFn: ({ signal }) => {
			const { minTime, maxTime } = getMinMaxTime();

			return fetchListData(
				{
					limit: MAX_ITEMS_TO_FETCH_WHEN_GROUP_BY,
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
		refetchInterval: isRefreshEnabled ? refreshInterval : false,
	});

	const formattedData = useMemo(() => {
		if (!data?.data) {
			return undefined;
		}

		const rows = data.data.map((item) => renderRowData(item, groupBy));

		// Without handling duplicated keys, the table became unpredictable/unstable
		const keyCount = new Map<string, number>();
		return rows.map((row): K8sRenderedRowData => {
			const count = keyCount.get(row.key) || 0;
			keyCount.set(row.key, count + 1);

			if (count > 0) {
				return { ...row, key: `${row.key}-${count}` };
			}
			return row;
		});
	}, [data?.data, renderRowData, groupBy]);

	const openRecordInNewTab = (rowRecord: K8sRenderedRowData): void => {
		const newParams = new URLSearchParams(document.location.search);
		newParams.set('selectedItem', rowRecord.itemKey);
		openInNewTab(
			buildAbsolutePath({
				relativePath: '',
				urlQueryString: newParams.toString(),
			}),
		);
	};

	const handleViewAllClick = (): void => {
		const filters = createFiltersForRecord();
		setFilters(filters);
		setCurrentPage(1);
		setGroupBy([]);
		setOrderBy(null);
	};

	return (
		<div
			className={styles.expandedTableContainer}
			data-testid="expanded-table-container"
		>
			{isError && (
				<Typography>{data?.error?.toString() || 'Something went wrong'}</Typography>
			)}

			{isFetching || isLoading ? (
				<LoadingContainer />
			) : (
				<div data-testid="expanded-table">
					<Table
						columns={nestedColumns}
						dataSource={formattedData}
						pagination={false}
						scroll={{ x: true }}
						tableLayout="fixed"
						showHeader={false}
						loading={{
							spinning: isFetching || isLoading,
							indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
						}}
						onRow={(
							rowRecord: K8sRenderedRowData,
						): { onClick: (event: React.MouseEvent) => void; className: string } => ({
							onClick: (event: React.MouseEvent): void => {
								if (isModifierKeyPressed(event)) {
									openRecordInNewTab(rowRecord);
									return;
								}
								setSelectedItem(rowRecord.itemKey);
							},
							className: styles.expandedClickableRow,
						})}
					/>

					{data?.total && data?.total > MAX_ITEMS_TO_FETCH_WHEN_GROUP_BY && (
						<div className={styles.expandedTableFooter}>
							<Button
								type="default"
								size="small"
								className={styles.viewAllButton}
								onClick={handleViewAllClick}
							>
								<CornerDownRight size={14} />
								View All
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
