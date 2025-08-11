/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import '../InfraMonitoringK8s.styles.scss';
import './K8sNodesList.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import {
	Button,
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
	Typography,
} from 'antd';
import { ColumnType, SorterResult } from 'antd/es/table/interface';
import logEvent from 'api/common/logEvent';
import { K8sNodesListPayload } from 'api/infraMonitoring/getK8sNodesList';
import { InfraMonitoringEvents } from 'constants/events';
import { useGetK8sNodesList } from 'hooks/infraMonitoring/useGetK8sNodesList';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import { FeatureKeys } from '../../../constants/features';
import { useAppContext } from '../../../providers/App/App';
import { getOrderByFromParams } from '../commonUtils';
import {
	GetK8sEntityToAggregateAttribute,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	K8sCategory,
} from '../constants';
import K8sHeader from '../K8sHeader';
import LoadingContainer from '../LoadingContainer';
import { usePageSize } from '../utils';
import NodeDetails from './NodeDetails';
import {
	defaultAddedColumns,
	formatDataForTable,
	getK8sNodesListColumns,
	getK8sNodesListQuery,
	K8sNodesRowData,
} from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function K8sNodesList({
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
	const [searchParams, setSearchParams] = useSearchParams();

	const [currentPage, setCurrentPage] = useState(() => {
		const page = searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.CURRENT_PAGE);
		if (page) {
			return parseInt(page, 10);
		}
		return 1;
	});
	const [filtersInitialised, setFiltersInitialised] = useState(false);

	useEffect(() => {
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[INFRA_MONITORING_K8S_PARAMS_KEYS.CURRENT_PAGE]: currentPage.toString(),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage]);

	const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>(() => getOrderByFromParams(searchParams, false));

	const [selectedNodeUID, setSelectedNodeUID] = useState<string | null>(() => {
		const nodeUID = searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.NODE_UID);
		if (nodeUID) {
			return nodeUID;
		}
		return null;
	});

	const { pageSize, setPageSize } = usePageSize(K8sCategory.NODES);

	const [groupBy, setGroupBy] = useState<IBuilderQuery['groupBy']>(() => {
		const groupBy = searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY);
		if (groupBy) {
			const decoded = decodeURIComponent(groupBy);
			const parsed = JSON.parse(decoded);
			return parsed as IBuilderQuery['groupBy'];
		}
		return [];
	});

	const [selectedRowData, setSelectedRowData] = useState<K8sNodesRowData | null>(
		null,
	);

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
	}, [quickFiltersLastUpdated]);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const createFiltersForSelectedRowData = (
		selectedRowData: K8sNodesRowData,
		groupBy: IBuilderQuery['groupBy'],
	): IBuilderQuery['filters'] => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [...queryFilters.items],
			op: 'and',
		};

		if (!selectedRowData) return baseFilters;

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
		if (!selectedRowData) return null;

		const baseQuery = getK8sNodesListQuery();

		const filters = createFiltersForSelectedRowData(selectedRowData, groupBy);

		return {
			...baseQuery,
			limit: 10,
			offset: 0,
			filters,
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [minTime, maxTime, orderBy, selectedRowData, groupBy]);

	const groupedByRowDataQueryKey = useMemo(() => {
		if (selectedNodeUID) {
			return [
				'nodeList',
				JSON.stringify(queryFilters),
				JSON.stringify(orderBy),
				JSON.stringify(selectedRowData),
			];
		}
		return [
			'nodeList',
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
			JSON.stringify(selectedRowData),
			String(minTime),
			String(maxTime),
		];
	}, [
		queryFilters,
		orderBy,
		selectedNodeUID,
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
	} = useGetK8sNodesList(
		fetchGroupedByRowDataQuery as K8sNodesListPayload,
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
				K8sCategory.NODES,
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
		const baseQuery = getK8sNodesListQuery();
		const queryPayload = {
			...baseQuery,
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			filters: queryFilters,
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy,
		};
		if (groupBy.length > 0) {
			queryPayload.groupBy = groupBy;
		}
		return queryPayload;
	}, [pageSize, currentPage, queryFilters, minTime, maxTime, orderBy, groupBy]);

	const nestedNodesData = useMemo(() => {
		if (!selectedRowData || !groupedByRowData?.payload?.data.records) return [];
		return groupedByRowData?.payload?.data?.records || [];
	}, [groupedByRowData, selectedRowData]);

	const formattedGroupedByNodesData = useMemo(
		() =>
			formatDataForTable(groupedByRowData?.payload?.data?.records || [], groupBy),
		[groupedByRowData, groupBy],
	);

	const queryKey = useMemo(() => {
		if (selectedNodeUID) {
			return [
				'nodeList',
				String(pageSize),
				String(currentPage),
				JSON.stringify(queryFilters),
				JSON.stringify(orderBy),
				JSON.stringify(groupBy),
			];
		}
		return [
			'nodeList',
			String(pageSize),
			String(currentPage),
			JSON.stringify(queryFilters),
			JSON.stringify(orderBy),
			JSON.stringify(groupBy),
			String(minTime),
			String(maxTime),
		];
	}, [
		selectedNodeUID,
		pageSize,
		currentPage,
		queryFilters,
		orderBy,
		groupBy,
		minTime,
		maxTime,
	]);

	const { data, isFetching, isLoading, isError } = useGetK8sNodesList(
		query as K8sNodesListPayload,
		{
			queryKey,
			enabled: !!query,
			keepPreviousData: true,
		},
		undefined,
		dotMetricsEnabled,
	);

	const nodesData = useMemo(() => data?.payload?.data?.records || [], [data]);
	const totalCount = data?.payload?.data?.total || 0;

	const formattedNodesData = useMemo(
		() => formatDataForTable(nodesData, groupBy),
		[nodesData, groupBy],
	);

	const columns = useMemo(() => getK8sNodesListColumns(groupBy), [groupBy]);

	const handleGroupByRowClick = (record: K8sNodesRowData): void => {
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

	const handleTableChange: TableProps<K8sNodesRowData>['onChange'] = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter: SorterResult<K8sNodesRowData> | SorterResult<K8sNodesRowData>[],
		): void => {
			if (pagination.current) {
				setCurrentPage(pagination.current);
				logEvent(InfraMonitoringEvents.PageNumberChanged, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.ListPage,
					category: InfraMonitoringEvents.Node,
				});
			}

			if ('field' in sorter && sorter.order) {
				const currentOrderBy = {
					columnName: sorter.field as string,
					order: (sorter.order === 'ascend' ? 'asc' : 'desc') as 'asc' | 'desc',
				};
				setOrderBy(currentOrderBy);
				setSearchParams({
					...Object.fromEntries(searchParams.entries()),
					[INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY]: JSON.stringify(
						currentOrderBy,
					),
				});
			} else {
				setOrderBy(null);
				setSearchParams({
					...Object.fromEntries(searchParams.entries()),
					[INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY]: JSON.stringify(null),
				});
			}
		},
		[searchParams, setSearchParams],
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
					category: InfraMonitoringEvents.Node,
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	useEffect(() => {
		logEvent(InfraMonitoringEvents.PageVisited, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: InfraMonitoringEvents.Node,
			total: data?.payload?.data?.total,
		});
	}, [data?.payload?.data?.total]);

	const selectedNodeData = useMemo(() => {
		if (!selectedNodeUID) return null;
		if (groupBy.length > 0) {
			// If grouped by, return the node from the formatted grouped by nodes data
			return (
				nestedNodesData.find((node) => node.nodeUID === selectedNodeUID) || null
			);
		}
		// If not grouped by, return the node from the nodes data
		return nodesData.find((node) => node.nodeUID === selectedNodeUID) || null;
	}, [selectedNodeUID, groupBy.length, nodesData, nestedNodesData]);

	const handleRowClick = (record: K8sNodesRowData): void => {
		if (groupBy.length === 0) {
			setSelectedRowData(null);
			setSelectedNodeUID(record.nodeUID);
			setSearchParams({
				...Object.fromEntries(searchParams.entries()),
				[INFRA_MONITORING_K8S_PARAMS_KEYS.NODE_UID]: record.nodeUID,
			});
		} else {
			handleGroupByRowClick(record);
		}

		logEvent(InfraMonitoringEvents.ItemClicked, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: InfraMonitoringEvents.Node,
		});
	};

	const nestedColumns = useMemo(() => getK8sNodesListColumns([]), []);

	const isGroupedByAttribute = groupBy.length > 0;

	const handleExpandedRowViewAllClick = (): void => {
		if (!selectedRowData) return;

		const filters = createFiltersForSelectedRowData(selectedRowData, groupBy);

		handleFiltersChange(filters);

		setCurrentPage(1);
		setSelectedRowData(null);
		setGroupBy([]);
		setOrderBy(null);
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY]: JSON.stringify([]),
			[INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY]: JSON.stringify(null),
		});
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
						className="expanded-table-view"
						columns={nestedColumns as ColumnType<K8sNodesRowData>[]}
						dataSource={formattedGroupedByNodesData}
						pagination={false}
						scroll={{ x: true }}
						tableLayout="fixed"
						size="small"
						loading={{
							spinning: isFetchingGroupedByRowData || isLoadingGroupedByRowData,
							indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
						}}
						showHeader={false}
						onRow={(record): { onClick: () => void; className: string } => ({
							onClick: (): void => {
								setSelectedNodeUID(record.nodeUID);
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
			record: K8sNodesRowData,
			e: React.MouseEvent<HTMLButtonElement>,
		) => void;
		record: K8sNodesRowData;
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

	const handleCloseNodeDetail = (): void => {
		setSelectedNodeUID(null);
		setSearchParams({
			...Object.fromEntries(
				Array.from(searchParams.entries()).filter(
					([key]) =>
						![
							INFRA_MONITORING_K8S_PARAMS_KEYS.NODE_UID,
							INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW,
							INFRA_MONITORING_K8S_PARAMS_KEYS.TRACES_FILTERS,
							INFRA_MONITORING_K8S_PARAMS_KEYS.EVENTS_FILTERS,
							INFRA_MONITORING_K8S_PARAMS_KEYS.LOG_FILTERS,
						].includes(key),
				),
			),
		});
	};

	const handleGroupByChange = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			const groupBy = [];

			for (let index = 0; index < value.length; index++) {
				const element = (value[index] as unknown) as string;

				const key = groupByFiltersData?.payload?.attributeKeys?.find(
					(key) => key.key === element,
				);

				if (key) {
					groupBy.push(key);
				}
			}
			// Reset pagination on switching to groupBy
			setCurrentPage(1);
			setGroupBy(groupBy);
			setExpandedRowKeys([]);
			setSearchParams({
				...Object.fromEntries(searchParams.entries()),
				[INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY]: JSON.stringify(groupBy),
			});

			logEvent(InfraMonitoringEvents.GroupByChanged, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: InfraMonitoringEvents.Node,
			});
		},
		[groupByFiltersData, searchParams, setSearchParams],
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
			category: InfraMonitoringEvents.Node,
		});
	};

	const showTableLoadingState =
		(isFetching || isLoading) && formattedNodesData.length === 0;

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
				showAutoRefresh={!selectedNodeData}
			/>
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			<Table
				className="k8s-list-table nodes-list-table"
				dataSource={showTableLoadingState ? [] : formattedNodesData}
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
				tableLayout="fixed"
				onChange={handleTableChange}
				onRow={(record): { onClick: () => void; className: string } => ({
					onClick: (): void => handleRowClick(record),
					className: 'clickable-row',
				})}
				expandable={{
					expandedRowRender: isGroupedByAttribute ? expandedRowRender : undefined,
					expandIcon: expandRowIconRenderer,
					expandedRowKeys,
				}}
			/>

			<NodeDetails
				node={selectedNodeData}
				isModalTimeSelection
				onClose={handleCloseNodeDetail}
			/>
		</div>
	);
}

export default K8sNodesList;
