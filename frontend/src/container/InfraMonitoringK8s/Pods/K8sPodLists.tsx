/* eslint-disable no-restricted-syntax */
import '../InfraMonitoringK8s.styles.scss';

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
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import { K8sPodsListPayload } from 'api/infraMonitoring/getK8sPodsList';
import classNames from 'classnames';
import { useGetK8sPodsList } from 'hooks/infraMonitoring/useGetK8sPodsList';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	K8sCategory,
	K8sEntityToAggregateAttributeMapping,
} from '../constants';
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

// eslint-disable-next-line sonarjs/cognitive-complexity
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

	const [currentPage, setCurrentPage] = useState(1);

	const [addedColumns, setAddedColumns] = useState<IEntityColumn[]>([]);

	const [availableColumns, setAvailableColumns] = useState<IEntityColumn[]>(
		defaultAvailableColumns,
	);

	const [groupBy, setGroupBy] = useState<IBuilderQuery['groupBy']>([]);

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

	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys(
		{
			dataSource: currentQuery.builder.queryData[0].dataSource,
			aggregateAttribute: K8sEntityToAggregateAttributeMapping[K8sCategory.PODS],
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
		setCurrentPage(1);
	}, [quickFiltersLastUpdated]);

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

	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>({ columnName: 'cpu', order: 'desc' });

	const [selectedPodUID, setSelectedPodUID] = useState<string | null>(null);

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
			orderBy,
		};

		if (groupBy.length > 0) {
			queryPayload.groupBy = groupBy;
		}

		return queryPayload;
	}, [pageSize, currentPage, queryFilters, minTime, maxTime, orderBy, groupBy]);

	const { data, isFetching, isLoading, isError } = useGetK8sPodsList(
		query as K8sPodsListPayload,
		{
			queryKey: ['hostList', query],
			enabled: !!query,
		},
	);

	const createFiltersForSelectedRowData = (
		selectedRowData: K8sPodsRowData,
	): IBuilderQuery['filters'] => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [...queryFilters.items],
			op: 'and',
		};

		if (!selectedRowData) return baseFilters;

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
		if (!selectedRowData) return null;

		const baseQuery = getK8sPodsListQuery();

		const filters = createFiltersForSelectedRowData(selectedRowData);

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
	}, [minTime, maxTime, orderBy, selectedRowData]);

	const {
		data: groupedByRowData,
		isFetching: isFetchingGroupedByRowData,
		isLoading: isLoadingGroupedByRowData,
		isError: isErrorGroupedByRowData,
		refetch: fetchGroupedByRowData,
	} = useGetK8sPodsList(fetchGroupedByRowDataQuery as K8sPodsListPayload, {
		queryKey: ['hostList', fetchGroupedByRowDataQuery],
		enabled: !!fetchGroupedByRowDataQuery && !!selectedRowData,
	});

	const podsData = useMemo(() => data?.payload?.data?.records || [], [data]);
	const totalCount = data?.payload?.data?.total || 0;

	const nestedPodsData = useMemo(() => {
		if (!selectedRowData || !groupedByRowData?.payload?.data.records) return [];
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

	const columns = useMemo(() => getK8sPodsListColumns(addedColumns, groupBy), [
		addedColumns,
		groupBy,
	]);

	const numberOfPages = useMemo(() => Math.ceil(totalCount / pageSize), [
		totalCount,
		pageSize,
	]);

	const handleTableChange: TableProps<K8sPodsRowData>['onChange'] = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter: SorterResult<K8sPodsRowData> | SorterResult<K8sPodsRowData>[],
		): void => {
			if (pagination.current) {
				setCurrentPage(pagination.current);
				logEvent('Infra Monitoring: K8s pods list page number changed', {
					page: pagination.current,
					pageSize,
					numberOfPages,
				});
			}

			if ('field' in sorter && sorter.order) {
				setOrderBy({
					columnName: sorter.field as string,
					order: sorter.order === 'ascend' ? 'asc' : 'desc',
				});
			} else {
				setOrderBy(null);
			}
		},
		[numberOfPages, pageSize],
	);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const handleFiltersChange = useCallback(
		(value: IBuilderQuery['filters']): void => {
			handleChangeQueryData('filters', value);
			setCurrentPage(1);

			logEvent('Infra Monitoring: K8s pods list filters applied', {});
		},
		[handleChangeQueryData],
	);

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

			logEvent('Infra Monitoring: K8s pods list group by changed', {});
		},
		[groupByFiltersData],
	);

	useEffect(() => {
		logEvent('Infra Monitoring: K8s pods list page visited', {});
	}, []);

	const selectedPodData = useMemo(() => {
		if (!selectedPodUID) return null;
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

	const handleRowClick = (record: K8sPodsRowData): void => {
		if (groupBy.length === 0) {
			setSelectedPodUID(record.podUID);
			setSelectedRowData(null);
		} else {
			handleGroupByRowClick(record);
		}

		logEvent('Infra Monitoring: K8s pods list item clicked', {
			podUID: record.podUID,
		});
	};

	const handleClosePodDetail = (): void => {
		setSelectedPodUID(null);
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

	const nestedColumns = useMemo(() => getK8sPodsListColumns(addedColumns, []), [
		addedColumns,
	]);

	const isGroupedByAttribute = groupBy.length > 0;

	const handleExpandedRowViewAllClick = (): void => {
		if (!selectedRowData) return;

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
						onRow={(record): { onClick: () => void; className: string } => ({
							onClick: (): void => setSelectedPodUID(record.podUID),
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
		logEvent('Infra Monitoring: K8s pods list page number changed', {
			page,
			pageSize,
			numberOfPages,
		});
	};

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
			/>
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			<Table
				className={classNames('k8s-list-table', {
					'expanded-k8s-list-table': isGroupedByAttribute,
				})}
				dataSource={isFetching || isLoading ? [] : formattedPodsData}
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
					spinning: isFetching || isLoading,
					indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
				}}
				locale={{
					emptyText:
						isFetching || isLoading ? null : (
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
