import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { LoadingOutlined } from '@ant-design/icons';
import {
	Button,
	Spin,
	Table,
	TableColumnType as ColumnType,
	TablePaginationConfig,
	TableProps,
} from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import logEvent from 'api/common/logEvent';
import { InfraMonitoringEvents } from 'constants/events';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { useGlobalTimeStore } from 'store/globalTime';
import {
	getAutoRefreshQueryKey,
	NANO_SECOND_MULTIPLIER,
} from 'store/globalTime/utils';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { buildAbsolutePath, isModifierKeyPressed } from 'utils/app';
import { openInNewTab } from 'utils/navigation';

import { InfraMonitoringEntity } from '../constants';
import {
	useInfraMonitoringCurrentPage,
	useInfraMonitoringFilters,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
} from '../hooks';
import { usePageSize } from '../utils';
import { K8sEmptyState } from './K8sEmptyState';
import { K8sExpandedRow } from './K8sExpandedRow';
import K8sHeader from './K8sHeader';
import { K8sBaseFilters, K8sRenderedRowData } from './types';
import {
	IEntityColumn,
	useInfraMonitoringTableColumnsForPage,
	useInfraMonitoringTableColumnsStore,
} from './useInfraMonitoringTableColumnsStore';

import styles from './K8sBaseList.module.scss';

export type K8sBaseListEmptyStateContext = {
	isError: boolean;
	error?: string | null;
	totalCount: number;
	hasFilters: boolean;
	isLoading: boolean;
	rawData?: unknown;
};

export type K8sBaseListProps<T = unknown> = {
	controlListPrefix?: React.ReactNode;
	entity: InfraMonitoringEntity;
	tableColumnsDefinitions: IEntityColumn[];
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
	eventCategory: InfraMonitoringEvents;
	renderEmptyState?: (
		context: K8sBaseListEmptyStateContext,
	) => React.ReactNode | null;
};

export function K8sBaseList<T>({
	controlListPrefix,
	entity,
	tableColumnsDefinitions,
	tableColumns,
	fetchListData,
	renderRowData,
	eventCategory,
	renderEmptyState,
}: K8sBaseListProps<T>): JSX.Element {
	const [queryFilters] = useInfraMonitoringFilters();
	const [currentPage, setCurrentPage] = useInfraMonitoringCurrentPage();
	const [groupBy] = useInfraMonitoringGroupBy();
	const [orderBy, setOrderBy] = useInfraMonitoringOrderBy();
	const [initialOrderBy] = useState(orderBy);
	const [selectedItem, setSelectedItem] = useQueryState(
		'selectedItem',
		parseAsString,
	);

	const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
	useEffect(() => {
		setExpandedRowKeys([]);
	}, [groupBy, currentPage]);
	const { pageSize, setPageSize } = usePageSize(entity);

	const initializeTableColumns = useInfraMonitoringTableColumnsStore(
		(state) => state.initializePageColumns,
	);
	useEffect(() => {
		initializeTableColumns(entity, tableColumnsDefinitions);
	}, [initializeTableColumns, entity, tableColumnsDefinitions]);

	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const refreshInterval = useGlobalTimeStore((s) => s.refreshInterval);
	const isRefreshEnabled = useGlobalTimeStore((s) => s.isRefreshEnabled);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);

	const queryKey = useMemo(() => {
		return getAutoRefreshQueryKey(
			selectedTime,
			'k8sBaseList',
			entity,
			String(pageSize),
			String(currentPage),
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
			JSON.stringify(groupBy),
		);
	}, [
		selectedTime,
		entity,
		pageSize,
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
					limit: pageSize,
					offset: (currentPage - 1) * pageSize,
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

	const pageData = data?.data;
	const totalCount = data?.total || 0;
	const hasFilters = (queryFilters?.items?.length ?? 0) > 0;

	const formattedItemsData = useMemo(() => {
		if (!pageData) {
			return undefined;
		}

		const rows = pageData.map((item) => renderRowData(item, groupBy));

		// Without handling duplicated keys, the table became unpredictable/unstable
		const keyCount = new Map<string, number>();
		return rows.map(
			// eslint-disable-next-line sonarjs/no-identical-functions
			(row): K8sRenderedRowData => {
				const count = keyCount.get(row.key) || 0;
				keyCount.set(row.key, count + 1);

				if (count > 0) {
					return { ...row, key: `${row.key}-${count}` };
				}
				return row;
			},
		);
	}, [pageData, renderRowData, groupBy]);

	const handleTableChange: TableProps<K8sRenderedRowData>['onChange'] =
		useCallback(
			(
				pagination: TablePaginationConfig,
				_filters: Record<string, (string | number | boolean)[] | null>,
				sorter:
					| SorterResult<K8sRenderedRowData>
					| SorterResult<K8sRenderedRowData>[],
			): void => {
				if (pagination.current) {
					setCurrentPage(pagination.current);
					logEvent(InfraMonitoringEvents.PageNumberChanged, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.ListPage,
						category: eventCategory,
					});
				}

				if ('field' in sorter && sorter.order) {
					setOrderBy({
						columnName: sorter.field as string,
						order: (sorter.order === 'ascend' ? 'asc' : 'desc') as 'asc' | 'desc',
					});
				} else {
					setOrderBy(null);
				}
			},
			[eventCategory, setCurrentPage, setOrderBy],
		);

	useEffect(() => {
		logEvent(InfraMonitoringEvents.PageVisited, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: eventCategory,
			total: totalCount,
		});
	}, [eventCategory, totalCount]);

	const handleGroupByRowClick = (record: K8sRenderedRowData): void => {
		if (expandedRowKeys.includes(record.key)) {
			setExpandedRowKeys(expandedRowKeys.filter((key) => key !== record.key));
		} else {
			setExpandedRowKeys([record.key]);
		}
	};

	const openItemInNewTab = (record: K8sRenderedRowData): void => {
		const newParams = new URLSearchParams(document.location.search);
		newParams.set('selectedItem', record.itemKey);
		openInNewTab(
			buildAbsolutePath({
				relativePath: '',
				urlQueryString: newParams.toString(),
			}),
		);
	};

	const handleRowClick = (
		record: K8sRenderedRowData,
		event: React.MouseEvent,
	): void => {
		if (event && isModifierKeyPressed(event)) {
			openItemInNewTab(record);
			return;
		}
		if (groupBy.length === 0) {
			setSelectedItem(record.itemKey);
		} else {
			handleGroupByRowClick(record);
		}

		logEvent(InfraMonitoringEvents.ItemClicked, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: eventCategory,
		});
	};

	const [columnsDefinitions, columnsHidden] =
		useInfraMonitoringTableColumnsForPage(entity);

	const hiddenColumnIdsOnList = useMemo(
		() =>
			columnsDefinitions
				.filter(
					(col) =>
						(groupBy?.length > 0 && col.behavior === 'hidden-on-expand') ||
						(!groupBy?.length && col.behavior === 'hidden-on-collapse'),
				)
				.map((col) => col.id),
		[columnsDefinitions, groupBy?.length],
	);

	const mapDefaultSort = useCallback(
		(
			tableColumn: ColumnType<K8sRenderedRowData>,
		): ColumnType<K8sRenderedRowData> => {
			if (tableColumn.key === initialOrderBy?.columnName) {
				return {
					...tableColumn,
					defaultSortOrder: initialOrderBy?.order === 'asc' ? 'ascend' : 'descend',
				};
			}

			return tableColumn;
		},
		[initialOrderBy?.columnName, initialOrderBy?.order],
	);

	const columns = useMemo(
		() =>
			tableColumns
				.filter(
					(c) =>
						!hiddenColumnIdsOnList.includes(c.key?.toString() || '') &&
						!columnsHidden.includes(c.key?.toString() || ''),
				)
				.map(mapDefaultSort),
		[columnsHidden, hiddenColumnIdsOnList, mapDefaultSort, tableColumns],
	);

	const isGroupedByAttribute = groupBy.length > 0;

	const expandedRowRender = (record: K8sRenderedRowData): JSX.Element => (
		<K8sExpandedRow<T>
			record={record}
			entity={entity}
			tableColumns={tableColumns}
			fetchListData={fetchListData}
			renderRowData={renderRowData}
		/>
	);

	const expandRowIconRenderer = ({
		expanded,
		onExpand,
		record,
	}: {
		expanded: boolean;
		onExpand: (
			record: K8sRenderedRowData,
			e: React.MouseEvent<HTMLButtonElement>,
		) => void;
		record: K8sRenderedRowData;
	}): JSX.Element | null => {
		if (!isGroupedByAttribute) {
			return null;
		}

		return expanded ? (
			<Button
				className="periscope-btn ghost"
				onClick={(e: React.MouseEvent<HTMLButtonElement>): void =>
					onExpand(record, e)
				}
				role="button"
			>
				<ChevronDown size={14} />
			</Button>
		) : (
			<Button
				className="periscope-btn ghost"
				onClick={(e: React.MouseEvent<HTMLButtonElement>): void =>
					onExpand(record, e)
				}
				role="button"
			>
				<ChevronRight size={14} />
			</Button>
		);
	};

	const onPaginationChange = (page: number, pageSize: number): void => {
		setCurrentPage(page);
		setPageSize(pageSize);
		logEvent(InfraMonitoringEvents.PageNumberChanged, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: eventCategory,
		});
	};

	const showTableLoadingState = isLoading;

	const emptyStateContext: K8sBaseListEmptyStateContext = {
		isError: isError || !!data?.error,
		error: data?.error,
		totalCount,
		hasFilters,
		isLoading: showTableLoadingState,
		rawData: data?.rawData,
	};

	const emptyTableMessage: React.ReactNode = renderEmptyState?.(
		emptyStateContext,
	) || (
		<K8sEmptyState
			isError={emptyStateContext.isError}
			error={emptyStateContext.error}
			isLoading={emptyStateContext.isLoading}
			rawData={emptyStateContext.rawData}
		/>
	);

	return (
		<>
			<K8sHeader
				controlListPrefix={controlListPrefix}
				entity={entity}
				showAutoRefresh={!selectedItem}
			/>
			<Table
				className={styles.k8SListTable}
				dataSource={showTableLoadingState ? [] : formattedItemsData}
				columns={columns}
				pagination={{
					current: currentPage,
					pageSize,
					total: totalCount,
					showSizeChanger: true,
					hideOnSinglePage: false,
					onChange: onPaginationChange,
					className: styles.paginationDock,
				}}
				loading={{
					spinning: showTableLoadingState,
					indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
				}}
				locale={{
					emptyText: showTableLoadingState ? null : emptyTableMessage,
				}}
				scroll={{ x: true }}
				tableLayout="fixed"
				onChange={handleTableChange}
				onRow={(
					record,
				): { onClick: (event: React.MouseEvent) => void; className: string } => ({
					onClick: (event: React.MouseEvent): void => handleRowClick(record, event),
					className: styles.clickableRow,
				})}
				expandable={{
					expandedRowRender: isGroupedByAttribute ? expandedRowRender : undefined,
					expandIcon: expandRowIconRenderer,
					expandedRowKeys,
				}}
			/>
		</>
	);
}
