/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import '../InfraMonitoringK8s.styles.scss';
import './K8sStatefulSetsList.styles.scss';

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
import { K8sStatefulSetsListPayload } from 'api/infraMonitoring/getsK8sStatefulSetsList';
import { useGetK8sStatefulSetsList } from 'hooks/infraMonitoring/useGetK8sStatefulSetsList';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
import StatefulSetDetails from './StatefulSetDetails';
import {
	defaultAddedColumns,
	formatDataForTable,
	getK8sStatefulSetsListColumns,
	getK8sStatefulSetsListQuery,
	K8sStatefulSetsRowData,
} from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function K8sStatefulSetsList({
	isFiltersVisible,
	handleFilterVisibilityChange,
}: {
	isFiltersVisible: boolean;
	handleFilterVisibilityChange: () => void;
}): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [currentPage, setCurrentPage] = useState(1);

	const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>(null);

	const [selectedStatefulSetUID, setselectedStatefulSetUID] = useState<
		string | null
	>(null);

	const pageSize = 10;

	const [groupBy, setGroupBy] = useState<IBuilderQuery['groupBy']>([]);

	const [
		selectedRowData,
		setSelectedRowData,
	] = useState<K8sStatefulSetsRowData | null>(null);

	const [groupByOptions, setGroupByOptions] = useState<
		{ value: string; label: string }[]
	>([]);

	const createFiltersForSelectedRowData = (
		selectedRowData: K8sStatefulSetsRowData,
		groupBy: IBuilderQuery['groupBy'],
	): IBuilderQuery['filters'] => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [],
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

		const baseQuery = getK8sStatefulSetsListQuery();

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
	}, [minTime, maxTime, orderBy, selectedRowData, groupBy]);

	const {
		data: groupedByRowData,
		isFetching: isFetchingGroupedByRowData,
		isLoading: isLoadingGroupedByRowData,
		isError: isErrorGroupedByRowData,
		refetch: fetchGroupedByRowData,
	} = useGetK8sStatefulSetsList(
		fetchGroupedByRowDataQuery as K8sStatefulSetsListPayload,
		{
			queryKey: ['statefulSetList', fetchGroupedByRowDataQuery],
			enabled: !!fetchGroupedByRowDataQuery && !!selectedRowData,
		},
	);

	const { currentQuery } = useQueryBuilder();

	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys(
		{
			dataSource: currentQuery.builder.queryData[0].dataSource,
			aggregateAttribute:
				K8sEntityToAggregateAttributeMapping[K8sCategory.STATEFULSETS],
			aggregateOperator: 'noop',
			searchText: '',
			tagType: '',
		},
		{
			queryKey: [currentQuery.builder.queryData[0].dataSource, 'noop'],
		},
		true,
		K8sCategory.STATEFULSETS,
	);

	const queryFilters = useMemo(
		() =>
			currentQuery?.builder?.queryData[0]?.filters || {
				items: [],
				op: 'and',
			},
		[currentQuery?.builder?.queryData],
	);

	const query = useMemo(() => {
		const baseQuery = getK8sStatefulSetsListQuery();
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
	}, [currentPage, minTime, maxTime, orderBy, groupBy, queryFilters]);

	const formattedGroupedByStatefulSetsData = useMemo(
		() =>
			formatDataForTable(groupedByRowData?.payload?.data?.records || [], groupBy),
		[groupedByRowData, groupBy],
	);

	const { data, isFetching, isLoading, isError } = useGetK8sStatefulSetsList(
		query as K8sStatefulSetsListPayload,
		{
			queryKey: ['statefulSetList', query],
			enabled: !!query,
		},
	);

	const statefulSetsData = useMemo(() => data?.payload?.data?.records || [], [
		data,
	]);
	const totalCount = data?.payload?.data?.total || 0;

	const formattedStatefulSetsData = useMemo(
		() => formatDataForTable(statefulSetsData, groupBy),
		[statefulSetsData, groupBy],
	);

	const columns = useMemo(() => getK8sStatefulSetsListColumns(groupBy), [
		groupBy,
	]);

	const handleGroupByRowClick = (record: K8sStatefulSetsRowData): void => {
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

	const handleTableChange: TableProps<K8sStatefulSetsRowData>['onChange'] = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter:
				| SorterResult<K8sStatefulSetsRowData>
				| SorterResult<K8sStatefulSetsRowData>[],
		): void => {
			if (pagination.current) {
				setCurrentPage(pagination.current);
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
		[],
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

			logEvent('Infra Monitoring: K8s list filters applied', {
				filters: value,
			});
		},
		[handleChangeQueryData],
	);

	useEffect(() => {
		logEvent('Infra Monitoring: K8s list page visited', {});
	}, []);

	const selectedStatefulSetData = useMemo(() => {
		if (!selectedStatefulSetUID) return null;
		return (
			statefulSetsData.find(
				(statefulSet) => statefulSet.statefulSetName === selectedStatefulSetUID,
			) || null
		);
	}, [selectedStatefulSetUID, statefulSetsData]);

	const handleRowClick = (record: K8sStatefulSetsRowData): void => {
		if (groupBy.length === 0) {
			setSelectedRowData(null);
			setselectedStatefulSetUID(record.key);
		} else {
			handleGroupByRowClick(record);
		}

		logEvent('Infra Monitoring: K8s statefulSet list item clicked', {
			statefulSetName: record.statefulsetName,
		});
	};

	const nestedColumns = useMemo(() => getK8sStatefulSetsListColumns([]), []);

	const isGroupedByAttribute = groupBy.length > 0;

	const handleExpandedRowViewAllClick = (): void => {
		if (!selectedRowData) return;

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
						columns={nestedColumns as ColumnType<K8sStatefulSetsRowData>[]}
						dataSource={formattedGroupedByStatefulSetsData}
						pagination={false}
						scroll={{ x: true }}
						tableLayout="fixed"
						size="small"
						loading={{
							spinning: isFetchingGroupedByRowData || isLoadingGroupedByRowData,
							indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
						}}
						showHeader={false}
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
			record: K8sStatefulSetsRowData,
			e: React.MouseEvent<HTMLButtonElement>,
		) => void;
		record: K8sStatefulSetsRowData;
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

	const handleCloseStatefulSetDetail = (): void => {
		setselectedStatefulSetUID(null);
	};

	const showsStatefulSetsTable =
		!isError &&
		!isLoading &&
		!isFetching &&
		!(formattedStatefulSetsData.length === 0 && queryFilters.items.length > 0);

	const showNoFilteredStatefulSetsMessage =
		!isFetching &&
		!isLoading &&
		formattedStatefulSetsData.length === 0 &&
		queryFilters.items.length > 0;

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

			setGroupBy(groupBy);
			setExpandedRowKeys([]);
		},
		[groupByFiltersData],
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
				entity={K8sCategory.STATEFULSETS}
			/>
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			{showNoFilteredStatefulSetsMessage && (
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
			)}

			{(isFetching || isLoading) && <LoadingContainer />}

			{showsStatefulSetsTable && (
				<Table
					className="k8s-list-table statefulSets-list-table"
					dataSource={isFetching || isLoading ? [] : formattedStatefulSetsData}
					columns={columns}
					pagination={{
						current: currentPage,
						pageSize,
						total: totalCount,
						showSizeChanger: false,
						hideOnSinglePage: true,
					}}
					scroll={{ x: true }}
					loading={{
						spinning: isFetching || isLoading,
						indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
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
			)}
			<StatefulSetDetails
				statefulSet={selectedStatefulSetData}
				isModalTimeSelection
				onClose={handleCloseStatefulSetDetail}
			/>
		</div>
	);
}

export default K8sStatefulSetsList;
