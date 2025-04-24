import { LoadingOutlined } from '@ant-design/icons';
import {
	Select,
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
	Typography,
} from 'antd';
import { SorterResult } from 'antd/lib/table/interface';
import logEvent from 'api/common/logEvent';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	EndPointsTableRowData,
	formatEndPointsDataForTable,
	getEndPointsColumnsConfig,
	getEndPointsQueryPayload,
} from 'container/ApiMonitoring/utils';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import ErrorState from './components/ErrorState';
import ExpandedRow from './components/ExpandedRow';
import { VIEW_TYPES, VIEWS } from './constants';

function AllEndPoints({
	domainName,
	setSelectedEndPointName,
	setSelectedView,
	groupBy,
	setGroupBy,
	timeRange,
}: {
	domainName: string;
	setSelectedEndPointName: (name: string) => void;
	setSelectedView: (tab: VIEWS) => void;
	groupBy: IBuilderQuery['groupBy'];
	setGroupBy: (groupBy: IBuilderQuery['groupBy']) => void;
	timeRange: {
		startTime: number;
		endTime: number;
	};
}): JSX.Element {
	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys({
		dataSource: DataSource.TRACES,
		aggregateAttribute: '',
		aggregateOperator: 'noop',
		searchText: '',
		tagType: '',
	});

	const [groupByOptions, setGroupByOptions] = useState<
		{ value: string; label: string }[]
	>([]);

	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>(null);

	const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

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
		},
		[groupByFiltersData, setGroupBy],
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

	const { startTime: minTime, endTime: maxTime } = timeRange;

	const queryPayloads = useMemo(
		() => getEndPointsQueryPayload(groupBy, domainName, minTime, maxTime),
		[groupBy, domainName, minTime, maxTime],
	);

	console.log('uncaught modalTimeRange', timeRange);

	// Since only one query here
	const endPointsDataQueries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: [
				REACT_QUERY_KEY.GET_ENDPOINTS_LIST_BY_DOMAIN,
				payload,
				ENTITY_VERSION_V4,
				groupBy,
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
			staleTime: 60 * 1000, // 1 minute stale time : optimize this part
		})),
	);

	const endPointsDataQuery = endPointsDataQueries[0];
	const {
		data: allEndPointsData,
		isLoading,
		isRefetching,
		isError,
		refetch,
	} = endPointsDataQuery;

	const endPointsColumnsConfig = useMemo(
		() => getEndPointsColumnsConfig(groupBy.length > 0, expandedRowKeys),
		[groupBy.length, expandedRowKeys],
	);

	const expandedRowRender = (record: EndPointsTableRowData): JSX.Element => (
		<ExpandedRow
			domainName={domainName}
			selectedRowData={record}
			setSelectedEndPointName={setSelectedEndPointName}
			setSelectedView={setSelectedView}
			orderBy={orderBy}
		/>
	);

	const handleGroupByRowClick = (record: EndPointsTableRowData): void => {
		if (expandedRowKeys.includes(record.key)) {
			setExpandedRowKeys(expandedRowKeys.filter((key) => key !== record.key));
		} else {
			setExpandedRowKeys((expandedRowKeys) => [...expandedRowKeys, record.key]);
		}
	};

	const handleRowClick = (record: EndPointsTableRowData): void => {
		if (groupBy.length === 0) {
			setSelectedEndPointName(record.endpointName); // this will open up the endpoint details tab
			setSelectedView(VIEW_TYPES.ENDPOINT_DETAILS);
			logEvent('API Monitoring: Endpoint name row clicked', {});
		} else {
			handleGroupByRowClick(record); // this will prepare the nested query payload
		}
	};

	const handleTableChange: TableProps<EndPointsTableRowData>['onChange'] = useCallback(
		(
			_pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter:
				| SorterResult<EndPointsTableRowData>
				| SorterResult<EndPointsTableRowData>[],
		): void => {
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

	const formattedEndPointsData = useMemo(
		() =>
			formatEndPointsDataForTable(
				allEndPointsData?.payload?.data?.result[0]?.table?.rows,
				groupBy,
				orderBy,
			),
		[groupBy, allEndPointsData, orderBy],
	);

	if (isError) {
		return (
			<div className="all-endpoints-error-state-wrapper">
				<ErrorState refetch={refetch} />
			</div>
		);
	}

	return (
		<div className="all-endpoints-container">
			<div className="group-by-container">
				<div className="group-by-label"> Group by </div>
				<Select
					className="group-by-select"
					loading={isLoadingGroupByFilters}
					mode="multiple"
					value={groupBy}
					allowClear
					maxTagCount="responsive"
					placeholder="Search for attribute"
					options={groupByOptions}
					onChange={handleGroupByChange}
				/>{' '}
			</div>
			<div className="endpoints-table-container">
				<div className="endpoints-table-header">Endpoint overview</div>
				<Table
					columns={endPointsColumnsConfig}
					loading={{
						spinning: isLoading || isRefetching,
						indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
					}}
					dataSource={isLoading || isRefetching ? [] : formattedEndPointsData}
					locale={{
						emptyText:
							isLoading || isRefetching ? null : (
								<div className="no-filtered-endpoints-message-container">
									<div className="no-filtered-endpoints-message-content">
										<img
											src="/Icons/emptyState.svg"
											alt="thinking-emoji"
											className="empty-state-svg"
										/>

										<Typography.Text className="no-filtered-endpoints-message">
											This query had no results. Edit your query and try again!
										</Typography.Text>
									</div>
								</div>
							),
					}}
					scroll={{ x: true }}
					tableLayout="fixed"
					onRow={(record): { onClick: () => void; className: string } => ({
						onClick: (): void => handleRowClick(record),
						className: 'clickable-row',
					})}
					expandable={{
						expandedRowRender: groupBy.length > 0 ? expandedRowRender : undefined,
						expandedRowKeys,
						expandIconColumnIndex: -1,
					}}
					rowClassName={(_, index): string =>
						index % 2 === 0 ? 'table-row-dark' : 'table-row-light'
					}
					onChange={handleTableChange}
				/>
			</div>
		</div>
	);
}

export default AllEndPoints;
