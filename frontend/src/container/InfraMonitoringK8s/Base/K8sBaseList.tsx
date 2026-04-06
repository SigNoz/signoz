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
	Typography,
} from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import logEvent from 'api/common/logEvent';
import { InfraMonitoringEvents } from 'constants/events';
import { ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { useGlobalTimeStore } from 'store/globalTime';
import {
	getAutoRefreshQueryKey,
	NANO_SECOND_MULTIPLIER,
} from 'store/globalTime/utils';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { buildAbsolutePath, isModifierKeyPressed } from 'utils/app';
import { openInNewTab } from 'utils/navigation';

import { K8sCategory } from '../constants';
import {
	useInfraMonitoringCurrentPage,
	useInfraMonitoringFilters,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
	useInfraMonitoringQueryFilters,
	useInfraMonitoringSelectedItem,
} from '../hooks';
import LoadingContainer from '../LoadingContainer';
import { OrderBySchemaType } from '../schemas';
import { usePageSize } from '../utils';
import K8sHeader from './K8sHeader';
import {
	IEntityColumn,
	useInfraMonitoringTableColumnsForPage,
	useInfraMonitoringTableColumnsStore,
} from './useInfraMonitoringTableColumnsStore';

import styles from './K8sBaseList.module.scss';

export type K8sBaseFilters = {
	filters?: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	start: number;
	end: number;
	orderBy?: OrderBySchemaType;
};

export type K8sRenderedRowData = {
	/**
	 * The unique ID for the row
	 */
	key: string;
	/**
	 * The ID to the selectedItem
	 */
	itemKey: string;
	groupedByMeta: Record<string, string>;
	[key: string]: unknown;
};

export type K8sBaseListProps<T = unknown> = {
	controlListPrefix?: React.ReactNode;
	entity: K8sCategory;
	tableColumnsDefinitions: IEntityColumn[];
	tableColumns: ColumnType<K8sRenderedRowData>[];
	fetchListData: (
		filters: K8sBaseFilters,
		signal?: AbortSignal,
	) => Promise<{
		data: T[];
		total: number;
		error?: string | null;
	}>;
	renderRowData: (
		record: T,
		groupBy: BaseAutocompleteData[],
	) => K8sRenderedRowData;
	eventCategory: InfraMonitoringEvents;
};

export type K8sExpandedRowProps<T> = {
	record: K8sRenderedRowData;
	entity: K8sCategory;
	tableColumns: ColumnType<K8sRenderedRowData>[];
	fetchListData: K8sBaseListProps<T>['fetchListData'];
	renderRowData: K8sBaseListProps<T>['renderRowData'];
};

function K8sExpandedRow<T>({
	record,
	entity,
	tableColumns,
	fetchListData,
	renderRowData,
}: K8sExpandedRowProps<T>): JSX.Element {
	const [groupBy, setGroupBy] = useInfraMonitoringGroupBy();
	const [orderBy, setOrderBy] = useInfraMonitoringOrderBy();
	const [, setCurrentPage] = useInfraMonitoringCurrentPage();
	const [, setFilters] = useInfraMonitoringFilters();
	const [, setSelectedItem] = useInfraMonitoringSelectedItem();

	const queryFilters = useInfraMonitoringQueryFilters();

	const [
		columnsDefinitions,
		columnsHidden,
	] = useInfraMonitoringTableColumnsForPage(entity);

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

	const createFiltersForRecord = useCallback((): IBuilderQuery['filters'] => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [...queryFilters.items],
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
	}, [queryFilters.items, record]);

	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const refreshInterval = useGlobalTimeStore((s) => s.refreshInterval);
	const isRefreshEnabled = useGlobalTimeStore((s) => s.isRefreshEnabled);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);

	const queryKey = useMemo(() => {
		return getAutoRefreshQueryKey(selectedTime, [
			'k8sExpandedRow',
			record.key,
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
		]);
	}, [selectedTime, record.key, queryFilters, orderBy]);

	const { data, isFetching, isLoading, isError } = useQuery({
		queryKey,
		queryFn: ({ signal }) => {
			const { minTime, maxTime } = getMinMaxTime();

			return fetchListData(
				{
					limit: 10,
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

	const formattedData = useMemo(
		() => data?.data?.map((item) => renderRowData(item, groupBy)),
		[data?.data, renderRowData, groupBy],
	);

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
		setFilters(JSON.stringify(filters));
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

					{data?.total && data?.total > 10 && (
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

export function K8sBaseList<T>({
	controlListPrefix,
	entity,
	tableColumnsDefinitions,
	tableColumns,
	fetchListData,
	renderRowData,
	eventCategory,
}: K8sBaseListProps<T>): JSX.Element {
	const queryFilters = useInfraMonitoringQueryFilters();
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
					filters: queryFilters,
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

	const formattedItemsData = useMemo(
		() => pageData?.map((item) => renderRowData(item, groupBy)),
		[pageData, renderRowData, groupBy],
	);

	const handleTableChange: TableProps<K8sRenderedRowData>['onChange'] = useCallback(
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

	const [
		columnsDefinitions,
		columnsHidden,
	] = useInfraMonitoringTableColumnsForPage(entity);

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

	return (
		<>
			<K8sHeader
				controlListPrefix={controlListPrefix}
				entity={entity}
				showAutoRefresh={!selectedItem}
			/>
			{isError && (
				<Typography>{data?.error?.toString() || 'Something went wrong'}</Typography>
			)}

			<Table
				className={styles.k8sListTable}
				dataSource={showTableLoadingState ? [] : formattedItemsData}
				columns={columns}
				pagination={{
					current: currentPage,
					pageSize,
					total: totalCount,
					showSizeChanger: true,
					hideOnSinglePage: false,
					onChange: onPaginationChange,
				}}
				loading={{
					spinning: showTableLoadingState,
					indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
				}}
				locale={{
					emptyText: showTableLoadingState ? null : (
						<div className={styles.noFilteredHostsMessageContainer}>
							<div className={styles.noFilteredHostsMessageContent}>
								<img
									src="/Icons/emptyState.svg"
									alt="thinking-emoji"
									className={styles.emptyStateSvg}
								/>

								<Typography.Text className={styles.noFilteredHostsMessage}>
									This query had no results. Edit your query and try again!
								</Typography.Text>
							</div>
						</div>
					),
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
