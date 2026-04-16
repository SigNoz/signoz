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
import logEvent from 'api/common/logEvent';
import { K8sClustersListPayload } from 'api/infraMonitoring/getK8sClustersList';
import { InfraMonitoringEvents } from 'constants/events';
import { useGetK8sClustersList } from 'hooks/infraMonitoring/useGetK8sClustersList';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { buildAbsolutePath, isModifierKeyPressed } from 'utils/app';
import { openInNewTab } from 'utils/navigation';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';

import { FeatureKeys } from '../../../constants/features';
import { useAppContext } from '../../../providers/App/App';
import {
	GetK8sEntityToAggregateAttribute,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	K8sCategory,
} from '../constants';
import {
	useInfraMonitoringClusterName,
	useInfraMonitoringCurrentPage,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
} from '../hooks';
import K8sHeader from '../K8sHeader';
import LoadingContainer from '../LoadingContainer';
import { usePageSize } from '../utils';
import ClusterDetails from './ClusterDetails';
import {
	defaultAddedColumns,
	formatDataForTable,
	getK8sClustersListColumns,
	getK8sClustersListQuery,
	K8sClustersRowData,
} from './utils';

import '../InfraMonitoringK8s.styles.scss';
import './K8sClustersList.styles.scss';

function K8sClustersList({
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
	const [
		selectedClusterName,
		setselectedClusterName,
	] = useInfraMonitoringClusterName();

	const [filtersInitialised, setFiltersInitialised] = useState(false);
	const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

	const { pageSize, setPageSize } = usePageSize(K8sCategory.CLUSTERS);

	const [
		selectedRowData,
		setSelectedRowData,
	] = useState<K8sClustersRowData | null>(null);

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

	// Reset pagination every time quick filters are changed
	useEffect(() => {
		if (quickFiltersLastUpdated !== -1) {
			setCurrentPage(1);
		}
	}, [quickFiltersLastUpdated, setCurrentPage]);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const createFiltersForSelectedRowData = (
		selectedRowData: K8sClustersRowData,
		groupBy: IBuilderQuery['groupBy'],
	): IBuilderQuery['filters'] => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [...queryFilters.items],
			op: 'and',
		};

		if (!selectedRowData) {
			return baseFilters;
		}

		const { groupedByMeta } = selectedRowData;

		for (const key of groupBy) {
			baseFilters.items.push({
				key: {
					key: key.key,
					type: null,
				},
				op: '=',
				value: groupedByMeta[key.key],
				id: key.key,
			});
		}

		return baseFilters;
	};

	const fetchGroupedByRowDataQuery = useMemo(() => {
		if (!selectedRowData) {
			return null;
		}

		const baseQuery = getK8sClustersListQuery();

		const filters = createFiltersForSelectedRowData(selectedRowData, groupBy);

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
	}, [minTime, maxTime, orderBy, selectedRowData, groupBy]);

	const groupedByRowDataQueryKey = useMemo(() => {
		// be careful with what you serialize from selectedRowData
		// since it's react node, it could contain circular references
		const selectedRowDataKey = JSON.stringify(selectedRowData?.groupedByMeta);
		if (selectedClusterName) {
			return [
				'clusterList',
				JSON.stringify(queryFilters),
				JSON.stringify(orderBy),
				selectedRowDataKey,
			];
		}
		return [
			'clusterList',
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
			selectedRowDataKey,
			String(minTime),
			String(maxTime),
		];
	}, [
		queryFilters,
		orderBy,
		selectedClusterName,
		minTime,
		maxTime,
		selectedRowData,
	]);

	const {
		data: groupedByRowData,
		isFetching: isFetchingGroupedByRowData,
		isLoading: isLoadingGroupedByRowData,
		isError: isErrorGroupedByRowData,
		refetch: fetchGroupedByRowData,
	} = useGetK8sClustersList(
		fetchGroupedByRowDataQuery as K8sClustersListPayload,
		{
			queryKey: groupedByRowDataQueryKey,
			enabled: !!fetchGroupedByRowDataQuery && !!selectedRowData,
		},
		undefined,
		dotMetricsEnabled,
	);

	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys(
		{
			dataSource: currentQuery.builder.queryData[0].dataSource,
			aggregateAttribute: GetK8sEntityToAggregateAttribute(
				K8sCategory.CLUSTERS,
				dotMetricsEnabled,
			),
			aggregateOperator: 'noop',
			searchText: '',
			tagType: '',
		},
		{
			queryKey: [currentQuery.builder.queryData[0].dataSource, 'noop'],
		},
		true,
		K8sCategory.NODES,
	);

	const query = useMemo(() => {
		const baseQuery = getK8sClustersListQuery();
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

	const formattedGroupedByClustersData = useMemo(
		() =>
			formatDataForTable(groupedByRowData?.payload?.data?.records || [], groupBy),
		[groupedByRowData, groupBy],
	);

	const nestedClustersData = useMemo(() => {
		if (!selectedRowData || !groupedByRowData?.payload?.data.records) {
			return [];
		}
		return groupedByRowData?.payload?.data?.records || [];
	}, [groupedByRowData, selectedRowData]);

	const queryKey = useMemo(() => {
		if (selectedClusterName) {
			return [
				'clusterList',
				String(pageSize),
				String(currentPage),
				JSON.stringify(queryFilters),
				JSON.stringify(orderBy),
				JSON.stringify(groupBy),
			];
		}
		return [
			'clusterList',
			String(pageSize),
			String(currentPage),
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
			JSON.stringify(groupBy),
			String(minTime),
			String(maxTime),
		];
	}, [
		selectedClusterName,
		pageSize,
		currentPage,
		queryFilters,
		orderBy,
		groupBy,
		minTime,
		maxTime,
	]);

	const { data, isFetching, isLoading, isError } = useGetK8sClustersList(
		query as K8sClustersListPayload,
		{
			queryKey,
			enabled: !!query,
			keepPreviousData: true,
		},
		undefined,
		dotMetricsEnabled,
	);

	const clustersData = useMemo(() => data?.payload?.data?.records || [], [data]);
	const totalCount = data?.payload?.data?.total || 0;

	const formattedClustersData = useMemo(
		() => formatDataForTable(clustersData, groupBy),
		[clustersData, groupBy],
	);

	const columns = useMemo(() => getK8sClustersListColumns(groupBy), [groupBy]);

	const handleGroupByRowClick = (record: K8sClustersRowData): void => {
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

	const handleTableChange: TableProps<K8sClustersRowData>['onChange'] = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter:
				| SorterResult<K8sClustersRowData>
				| SorterResult<K8sClustersRowData>[],
		): void => {
			if (pagination.current) {
				setCurrentPage(pagination.current);
				logEvent(InfraMonitoringEvents.PageNumberChanged, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.ListPage,
					category: InfraMonitoringEvents.Cluster,
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
					category: InfraMonitoringEvents.Cluster,
					page: InfraMonitoringEvents.ListPage,
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	useEffect(() => {
		logEvent(InfraMonitoringEvents.PageVisited, {
			entity: InfraMonitoringEvents.K8sEntity,
			category: InfraMonitoringEvents.Cluster,
			page: InfraMonitoringEvents.ListPage,
			total: data?.payload?.data?.total,
		});
	}, [data?.payload?.data?.total]);

	const selectedClusterData = useMemo(() => {
		if (!selectedClusterName) {
			return null;
		}
		if (groupBy.length > 0) {
			// If grouped by, return the cluster from the formatted grouped by clusters data
			return (
				nestedClustersData.find(
					(cluster) => cluster.meta.k8s_cluster_name === selectedClusterName,
				) || null
			);
		}
		// If not grouped by, return the cluster from the clusters data
		return (
			clustersData.find(
				(cluster) => cluster.meta.k8s_cluster_name === selectedClusterName,
			) || null
		);
	}, [selectedClusterName, groupBy.length, clustersData, nestedClustersData]);

	const openClusterInNewTab = (record: K8sClustersRowData): void => {
		const newParams = new URLSearchParams(document.location.search);
		newParams.set(
			INFRA_MONITORING_K8S_PARAMS_KEYS.CLUSTER_NAME,
			record.clusterUID,
		);
		openInNewTab(
			buildAbsolutePath({
				relativePath: '',
				urlQueryString: newParams.toString(),
			}),
		);
	};

	const handleRowClick = (
		record: K8sClustersRowData,
		event: React.MouseEvent,
	): void => {
		if (event && isModifierKeyPressed(event)) {
			openClusterInNewTab(record);
			return;
		}
		if (groupBy.length === 0) {
			setSelectedRowData(null);
			setselectedClusterName(record.clusterUID);
		} else {
			handleGroupByRowClick(record);
		}

		logEvent(InfraMonitoringEvents.ItemClicked, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: InfraMonitoringEvents.Cluster,
		});
	};

	const nestedColumns = useMemo(() => getK8sClustersListColumns([]), []);

	const isGroupedByAttribute = groupBy.length > 0;

	const handleExpandedRowViewAllClick = (): void => {
		if (!selectedRowData) {
			return;
		}

		const filters = createFiltersForSelectedRowData(selectedRowData, groupBy);

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
						columns={nestedColumns as ColumnType<K8sClustersRowData>[]}
						dataSource={formattedGroupedByClustersData}
						pagination={false}
						scroll={{ x: true }}
						tableLayout="fixed"
						size="small"
						loading={{
							spinning: isFetchingGroupedByRowData || isLoadingGroupedByRowData,
							indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
						}}
						showHeader={false}
						onRow={(
							record,
						): { onClick: (event: React.MouseEvent) => void; className: string } => ({
							onClick: (event: React.MouseEvent): void => {
								if (event && isModifierKeyPressed(event)) {
									openClusterInNewTab(record);
									return;
								}
								setselectedClusterName(record.clusterUID);
							},
							className: 'expanded-clickable-row',
						})}
					/>

					{groupedByRowData?.payload?.data?.total &&
					groupedByRowData?.payload?.data?.total > 10 ? (
						<div className="expanded-table-footer">
							<Button
								type="default"
								size="small"
								className="periscope-btn secondary"
								onClick={handleExpandedRowViewAllClick}
							>
								View All
							</Button>
						</div>
					) : null}
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
			record: K8sClustersRowData,
			e: React.MouseEvent<HTMLButtonElement>,
		) => void;
		record: K8sClustersRowData;
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

	const handleCloseClusterDetail = (): void => {
		setselectedClusterName(null);
	};

	const handleGroupByChange = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			const newGroupBy = [];

			for (let index = 0; index < value.length; index++) {
				const element = (value[index] as unknown) as string;

				const key = groupByFiltersData?.payload?.attributeKeys?.find(
					(key) => key.key === element,
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
				category: InfraMonitoringEvents.Cluster,
			});
		},
		[groupByFiltersData, setCurrentPage, setGroupBy],
	);

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

	const onPaginationChange = (page: number, pageSize: number): void => {
		setCurrentPage(page);
		setPageSize(pageSize);
		logEvent(InfraMonitoringEvents.PageNumberChanged, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: InfraMonitoringEvents.Cluster,
		});
	};

	const showTableLoadingState =
		(isFetching || isLoading) && formattedClustersData.length === 0;

	return (
		<div className="k8s-list">
			<K8sHeader
				isFiltersVisible={isFiltersVisible}
				handleFilterVisibilityChange={handleFilterVisibilityChange}
				defaultAddedColumns={defaultAddedColumns}
				handleFiltersChange={handleFiltersChange}
				groupByOptions={groupByOptions}
				isLoadingGroupByFilters={isLoadingGroupByFilters}
				handleGroupByChange={handleGroupByChange}
				selectedGroupBy={groupBy}
				entity={K8sCategory.NODES}
				showAutoRefresh={!selectedClusterData}
			/>
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			<Table
				className="k8s-list-table clusters-list-table"
				dataSource={showTableLoadingState ? [] : formattedClustersData}
				columns={columns}
				pagination={{
					current: currentPage,
					pageSize,
					total: totalCount,
					showSizeChanger: true,
					hideOnSinglePage: false,
					onChange: onPaginationChange,
				}}
				scroll={{ x: true }}
				loading={{
					spinning: showTableLoadingState,
					indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
				}}
				locale={{
					emptyText: showTableLoadingState ? null : (
						<div className="no-filtered-hosts-message-container">
							<div className="no-filtered-hosts-message-content">
								<img
									src={emptyStateUrl}
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
				tableLayout="fixed"
				onChange={handleTableChange}
				onRow={(
					record,
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

			<ClusterDetails
				cluster={selectedClusterData}
				isModalTimeSelection
				onClose={handleCloseClusterDetail}
			/>
		</div>
	);
}

export default K8sClustersList;
