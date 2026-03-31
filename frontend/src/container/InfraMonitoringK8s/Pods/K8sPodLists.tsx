import React, { useCallback, useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
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
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import { K8sPodsListPayload } from 'api/infraMonitoring/getK8sPodsList';
import classNames from 'classnames';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useGetK8sPodsList } from 'hooks/infraMonitoring/useGetK8sPodsList';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { buildAbsolutePath, isModifierKeyPressed } from 'utils/app';
import { openInNewTab } from 'utils/navigation';

import {
	GetK8sEntityToAggregateAttribute,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	K8sCategory,
} from '../constants';
import {
	useInfraMonitoringCurrentPage,
	useInfraMonitoringEventsFilters,
	useInfraMonitoringGroupBy,
	useInfraMonitoringLogFilters,
	useInfraMonitoringOrderBy,
	useInfraMonitoringPodUID,
	useInfraMonitoringTracesFilters,
	useInfraMonitoringView,
} from '../hooks';
import K8sHeader from '../K8sHeader';
import LoadingContainer from '../LoadingContainer';
import {
	defaultAddedColumns,
	defaultAvailableColumns,
	formatDataForTable,
	getK8sPodsListColumns,
	getK8sPodsListQuery,
	IEntityColumn,
	K8sPodsRowData,
	usePageSize,
} from '../utils';
import PodDetails from './PodDetails/PodDetails';

import '../InfraMonitoringK8s.styles.scss';

function K8sPodsList({
	isFiltersVisible,
	handleFilterVisibilityChange,
	quickFiltersLastUpdated,
}: {
	isFiltersVisible: boolean;
	handleFilterVisibilityChange: () => void;
	quickFiltersLastUpdated: number;
}): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [currentPage, setCurrentPage] = useInfraMonitoringCurrentPage();
	const [groupBy, setGroupBy] = useInfraMonitoringGroupBy();
	const [orderBy, setOrderBy] = useInfraMonitoringOrderBy();
	const [defaultOrderBy] = useState(orderBy);
	const [selectedPodUID, setSelectedPodUID] = useInfraMonitoringPodUID();
	const [, setView] = useInfraMonitoringView();
	const [, setTracesFilters] = useInfraMonitoringTracesFilters();
	const [, setEventsFilters] = useInfraMonitoringEventsFilters();
	const [, setLogFilters] = useInfraMonitoringLogFilters();

	const [filtersInitialised, setFiltersInitialised] = useState(false);

	const [addedColumns, setAddedColumns] = useState<IEntityColumn[]>([]);

	const [availableColumns, setAvailableColumns] = useState<IEntityColumn[]>(
		defaultAvailableColumns,
	);

	const [selectedRowData, setSelectedRowData] = useState<K8sPodsRowData | null>(
		null,
	);

	const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

	const [groupByOptions, setGroupByOptions] = useState<
		{ value: string; label: string }[]
	>([]);

	const { currentQuery } = useQueryBuilder();

	const queryFilters = useMemo(
		() =>
			currentQuery?.builder?.queryData[0]?.filters || {
				items: [],
				op: 'and',
			},
		[currentQuery?.builder?.queryData],
	);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys(
		{
			dataSource: currentQuery.builder.queryData[0].dataSource,
			aggregateAttribute: GetK8sEntityToAggregateAttribute(
				K8sCategory.PODS,
				dotMetricsEnabled,
			),
			aggregateOperator: 'noop',
			searchText: '',
			tagType: '',
		},
		{
			queryKey: [currentQuery.builder.queryData[0].dataSource, 'noop'],
		},
		true, // isInfraMonitoring
		K8sCategory.PODS, // infraMonitoringEntity
	);

	// Reset pagination every time quick filters are changed
	useEffect(() => {
		if (quickFiltersLastUpdated !== -1) {
			setCurrentPage(1);
		}
	}, [quickFiltersLastUpdated, setCurrentPage]);

	useEffect(() => {
		const addedColumns = JSON.parse(get('k8sPodsAddedColumns') ?? '[]');

		if (addedColumns && addedColumns.length > 0) {
			const availableColumns = defaultAvailableColumns.filter(
				(column) => !addedColumns.includes(column.id),
			);

			const newAddedColumns = defaultAvailableColumns.filter((column) =>
				addedColumns.includes(column.id),
			);

			setAvailableColumns(availableColumns);
			setAddedColumns(newAddedColumns);
		}
	}, []);

	const { pageSize, setPageSize } = usePageSize(K8sCategory.PODS);

	const query = useMemo(() => {
		const baseQuery = getK8sPodsListQuery();

		const queryPayload = {
			...baseQuery,
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			filters: queryFilters,
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy: orderBy || baseQuery.orderBy,
		};

		if (groupBy.length > 0) {
			queryPayload.groupBy = groupBy;
		}

		return queryPayload;
	}, [pageSize, currentPage, queryFilters, minTime, maxTime, orderBy, groupBy]);

	const queryKey = useMemo(() => {
		if (selectedPodUID) {
			return [
				'podList',
				String(pageSize),
				String(currentPage),
				JSON.stringify(queryFilters),
				JSON.stringify(orderBy),
				JSON.stringify(groupBy),
			];
		}
		return [
			'podList',
			String(pageSize),
			String(currentPage),
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
			JSON.stringify(groupBy),
			String(minTime),
			String(maxTime),
		];
	}, [
		selectedPodUID,
		pageSize,
		currentPage,
		queryFilters,
		orderBy,
		groupBy,
		minTime,
		maxTime,
	]);

	const { data, isFetching, isLoading, isError } = useGetK8sPodsList(
		query as K8sPodsListPayload,
		{
			queryKey,
			enabled: !!query,
			keepPreviousData: true,
		},
		undefined,
		dotMetricsEnabled,
	);

	const createFiltersForSelectedRowData = (
		selectedRowData: K8sPodsRowData,
	): IBuilderQuery['filters'] => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [...queryFilters.items],
			op: 'and',
		};

		if (!selectedRowData) {
			return baseFilters;
		}

		const { groupedByMeta } = selectedRowData;

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
	};

	const fetchGroupedByRowDataQuery = useMemo(() => {
		if (!selectedRowData) {
			return null;
		}

		const baseQuery = getK8sPodsListQuery();

		const filters = createFiltersForSelectedRowData(selectedRowData);

		return {
			...baseQuery,
			limit: 10,
			offset: 0,
			filters,
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy: orderBy || baseQuery.orderBy,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [minTime, maxTime, orderBy, selectedRowData]);

	const groupedByRowDataQueryKey = useMemo(() => {
		// be careful with what you serialize from selectedRowData
		// since it's react node, it could contain circular references
		const selectedRowDataKey = JSON.stringify(selectedRowData?.groupedByMeta);
		if (selectedPodUID) {
			return [
				'podList',
				JSON.stringify(queryFilters),
				JSON.stringify(orderBy),
				selectedRowDataKey,
			];
		}
		return [
			'podList',
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
			selectedRowDataKey,
			String(minTime),
			String(maxTime),
		];
	}, [queryFilters, orderBy, selectedPodUID, minTime, maxTime, selectedRowData]);

	const {
		data: groupedByRowData,
		isFetching: isFetchingGroupedByRowData,
		isLoading: isLoadingGroupedByRowData,
		isError: isErrorGroupedByRowData,
		refetch: fetchGroupedByRowData,
	} = useGetK8sPodsList(
		fetchGroupedByRowDataQuery as K8sPodsListPayload,
		{
			queryKey: groupedByRowDataQueryKey,
			enabled: !!fetchGroupedByRowDataQuery && !!selectedRowData,
		},
		undefined,
		dotMetricsEnabled,
	);

	const podsData = useMemo(() => data?.payload?.data?.records || [], [data]);
	const totalCount = data?.payload?.data?.total || 0;

	const nestedPodsData = useMemo(() => {
		if (!selectedRowData || !groupedByRowData?.payload?.data.records) {
			return [];
		}
		return groupedByRowData?.payload?.data?.records || [];
	}, [groupedByRowData, selectedRowData]);

	const formattedPodsData = useMemo(
		() => formatDataForTable(podsData, groupBy),
		[podsData, groupBy],
	);

	const formattedGroupedByPodsData = useMemo(
		() =>
			formatDataForTable(groupedByRowData?.payload?.data?.records || [], groupBy),
		[groupedByRowData, groupBy],
	);

	const columns = useMemo(
		() => getK8sPodsListColumns(addedColumns, groupBy, defaultOrderBy),
		[addedColumns, groupBy, defaultOrderBy],
	);

	const handleTableChange: TableProps<K8sPodsRowData>['onChange'] = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter: SorterResult<K8sPodsRowData> | SorterResult<K8sPodsRowData>[],
		): void => {
			if (pagination.current) {
				setCurrentPage(pagination.current);
				logEvent(InfraMonitoringEvents.PageNumberChanged, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.ListPage,
					category: InfraMonitoringEvents.Pod,
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
		[setCurrentPage, setOrderBy],
	);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const handleFiltersChange = useCallback(
		(value: IBuilderQuery['filters']): void => {
			handleChangeQueryData('filters', value);
			if (filtersInitialised) {
				setCurrentPage(1);
			} else {
				setFiltersInitialised(true);
			}

			if (value?.items && value?.items?.length > 0) {
				logEvent(InfraMonitoringEvents.FilterApplied, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.ListPage,
					category: InfraMonitoringEvents.Pod,
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleGroupByChange = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			const newGroupBy = [];

			for (let index = 0; index < value.length; index++) {
				const element = (value[index] as unknown) as string;

				const key = groupByFiltersData?.payload?.attributeKeys?.find(
					(k) => k.key === element,
				);

				if (key) {
					newGroupBy.push(key);
				}
			}

			// Reset pagination on switching to groupBy
			setCurrentPage(1);
			setGroupBy(newGroupBy);
			setExpandedRowKeys([]);

			logEvent(InfraMonitoringEvents.GroupByChanged, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: InfraMonitoringEvents.Pod,
			});
		},
		[groupByFiltersData, setCurrentPage, setGroupBy],
	);

	useEffect(() => {
		logEvent(InfraMonitoringEvents.PageVisited, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: InfraMonitoringEvents.Pod,
			total: data?.payload?.data?.total,
		});
	}, [data?.payload?.data?.total]);

	const selectedPodData = useMemo(() => {
		if (!selectedPodUID) {
			return null;
		}
		if (groupBy.length > 0) {
			// If grouped by, return the pod from the formatted grouped by pods data
			return nestedPodsData.find((pod) => pod.podUID === selectedPodUID) || null;
		}
		// If not grouped by, return the node from the nodes data
		return podsData.find((pod) => pod.podUID === selectedPodUID) || null;
	}, [selectedPodUID, groupBy.length, podsData, nestedPodsData]);

	const handleGroupByRowClick = (record: K8sPodsRowData): void => {
		setSelectedRowData(record);

		if (expandedRowKeys.includes(record.key)) {
			setExpandedRowKeys(expandedRowKeys.filter((key) => key !== record.key));
		} else {
			setExpandedRowKeys([record.key]);
		}
	};

	useEffect(() => {
		if (selectedRowData) {
			fetchGroupedByRowData();
		}
	}, [selectedRowData, fetchGroupedByRowData]);

	const openPodInNewTab = (record: K8sPodsRowData): void => {
		const newParams = new URLSearchParams(document.location.search);
		newParams.set(INFRA_MONITORING_K8S_PARAMS_KEYS.POD_UID, record.podUID);
		openInNewTab(
			buildAbsolutePath({
				relativePath: '',
				urlQueryString: newParams.toString(),
			}),
		);
	};

	const handleRowClick = (
		record: K8sPodsRowData,
		event: React.MouseEvent,
	): void => {
		if (event && isModifierKeyPressed(event)) {
			openPodInNewTab(record);
			return;
		}
		if (groupBy.length === 0) {
			setSelectedPodUID(record.podUID);
			setSelectedRowData(null);
		} else {
			handleGroupByRowClick(record);
		}

		logEvent(InfraMonitoringEvents.ItemClicked, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: InfraMonitoringEvents.Pod,
		});
	};

	const handleClosePodDetail = (): void => {
		setSelectedPodUID(null);
		setView(null);
		setTracesFilters(null);
		setEventsFilters(null);
		setLogFilters(null);
	};

	const handleAddColumn = useCallback(
		(column: IEntityColumn): void => {
			setAddedColumns((prev) => [...prev, column]);

			setAvailableColumns((prev) => prev.filter((c) => c.value !== column.value));
		},
		[setAddedColumns, setAvailableColumns],
	);

	// Update local storage when added columns updated
	useEffect(() => {
		const addedColumnIDs = addedColumns.map((column) => column.id);

		set('k8sPodsAddedColumns', JSON.stringify(addedColumnIDs));
	}, [addedColumns]);

	useEffect(() => {
		if (groupByFiltersData?.payload) {
			setGroupByOptions(
				groupByFiltersData?.payload?.attributeKeys?.map((filter) => ({
					value: filter.key,
					label: filter.key,
				})) || [],
			);
		}
	}, [groupByFiltersData]);

	const handleRemoveColumn = useCallback(
		(column: IEntityColumn): void => {
			setAddedColumns((prev) => prev.filter((c) => c.value !== column.value));

			setAvailableColumns((prev) => [...prev, column]);
		},
		[setAddedColumns, setAvailableColumns],
	);

	const nestedColumns = useMemo(
		() => getK8sPodsListColumns(addedColumns, [], defaultOrderBy),
		[addedColumns, defaultOrderBy],
	);

	const isGroupedByAttribute = groupBy.length > 0;

	const handleExpandedRowViewAllClick = (): void => {
		if (!selectedRowData) {
			return;
		}

		const filters = createFiltersForSelectedRowData(selectedRowData);

		handleFiltersChange(filters);

		setCurrentPage(1);
		setSelectedRowData(null);
		setGroupBy([]);
		setOrderBy(null);
	};

	const expandedRowRender = (): JSX.Element => (
		<div className="expanded-table-container">
			{isErrorGroupedByRowData && (
				<Typography>{groupedByRowData?.error || 'Something went wrong'}</Typography>
			)}

			{isFetchingGroupedByRowData || isLoadingGroupedByRowData ? (
				<LoadingContainer />
			) : (
				<div className="expanded-table">
					<Table
						columns={nestedColumns as ColumnType<K8sPodsRowData>[]}
						dataSource={formattedGroupedByPodsData}
						pagination={false}
						scroll={{ x: true }}
						tableLayout="fixed"
						showHeader={false}
						loading={{
							spinning: isFetchingGroupedByRowData || isLoadingGroupedByRowData,
							indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
						}}
						onRow={(
							record: K8sPodsRowData,
						): { onClick: (event: React.MouseEvent) => void; className: string } => ({
							onClick: (event: React.MouseEvent): void => {
								if (isModifierKeyPressed(event)) {
									openPodInNewTab(record);
									return;
								}
								setSelectedPodUID(record.podUID);
							},
							className: 'expanded-clickable-row',
						})}
					/>

					{groupedByRowData?.payload?.data?.total &&
						groupedByRowData?.payload?.data?.total > 10 && (
							<div className="expanded-table-footer">
								<Button
									type="default"
									size="small"
									className="periscope-btn secondary"
									onClick={handleExpandedRowViewAllClick}
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

	const expandRowIconRenderer = ({
		expanded,
		onExpand,
		record,
	}: {
		expanded: boolean;
		onExpand: (
			record: K8sPodsRowData,
			e: React.MouseEvent<HTMLButtonElement>,
		) => void;
		record: K8sPodsRowData;
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
			category: InfraMonitoringEvents.Pod,
		});
	};

	const showTableLoadingState =
		(isFetching || isLoading) && formattedPodsData.length === 0;

	return (
		<div className="k8s-list">
			<K8sHeader
				selectedGroupBy={groupBy}
				groupByOptions={groupByOptions}
				isLoadingGroupByFilters={isLoadingGroupByFilters}
				isFiltersVisible={isFiltersVisible}
				handleFilterVisibilityChange={handleFilterVisibilityChange}
				defaultAddedColumns={defaultAddedColumns}
				addedColumns={addedColumns}
				availableColumns={availableColumns}
				handleFiltersChange={handleFiltersChange}
				handleGroupByChange={handleGroupByChange}
				onAddColumn={handleAddColumn}
				onRemoveColumn={handleRemoveColumn}
				entity={K8sCategory.PODS}
				showAutoRefresh={!selectedPodData}
			/>
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			<Table
				className={classNames('k8s-list-table', {
					'expanded-k8s-list-table': isGroupedByAttribute,
				})}
				dataSource={showTableLoadingState ? [] : formattedPodsData}
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
						<div className="no-filtered-hosts-message-container">
							<div className="no-filtered-hosts-message-content">
								<img
									src="/Icons/emptyState.svg"
									alt="thinking-emoji"
									className="empty-state-svg"
								/>

								<Typography.Text className="no-filtered-hosts-message">
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
					record: K8sPodsRowData,
				): { onClick: (event: React.MouseEvent) => void; className: string } => ({
					onClick: (event: React.MouseEvent): void => handleRowClick(record, event),
					className: 'clickable-row',
				})}
				expandable={{
					expandedRowRender: isGroupedByAttribute ? expandedRowRender : undefined,
					expandIcon: expandRowIconRenderer,
					expandedRowKeys,
				}}
			/>

			{selectedPodData && (
				<PodDetails
					pod={selectedPodData}
					isModalTimeSelection
					onClose={handleClosePodDetail}
				/>
			)}
		</div>
	);
}

export default K8sPodsList;
