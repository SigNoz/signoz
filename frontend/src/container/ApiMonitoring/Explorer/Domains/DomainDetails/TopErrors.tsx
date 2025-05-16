import { LoadingOutlined } from '@ant-design/icons';
import { Spin, Switch, Table, Tooltip, Typography } from 'antd';
import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { DEFAULT_ENTITY_VERSION, ENTITY_VERSION_V4 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	END_POINT_DETAILS_QUERY_KEYS_ARRAY,
	formatTopErrorsDataForTable,
	getEndPointDetailsQueryPayload,
	getTopErrorsColumnsConfig,
	getTopErrorsCoRelationQueryFilters,
	getTopErrorsQueryPayload,
	TopErrorsResponseRow,
} from 'container/ApiMonitoring/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import EndPointsDropDown from './components/EndPointsDropDown';
import ErrorState from './components/ErrorState';
import { SPAN_ATTRIBUTES } from './constants';

function TopErrors({
	domainName,
	timeRange,
	initialFilters,
}: {
	domainName: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	initialFilters: IBuilderQuery['filters'];
}): JSX.Element {
	const { startTime: minTime, endTime: maxTime } = timeRange;

	const [endPointName, setSelectedEndPointName] = useState<string>('');
	const [showStatusCodeErrors, setShowStatusCodeErrors] = useState<boolean>(
		true,
	);

	const queryPayloads = useMemo(
		() =>
			getTopErrorsQueryPayload(
				domainName,
				minTime,
				maxTime,
				{
					items: endPointName
						? [
								{
									id: '92b8a1c1',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.URL_PATH,
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								...initialFilters.items,
						  ]
						: [...initialFilters.items],
					op: 'AND',
				},
				showStatusCodeErrors,
			),
		[
			domainName,
			endPointName,
			minTime,
			maxTime,
			initialFilters,
			showStatusCodeErrors,
		],
	);

	const topErrorsDataQueries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: [
				REACT_QUERY_KEY.GET_TOP_ERRORS_BY_DOMAIN,
				payload,
				DEFAULT_ENTITY_VERSION,
				showStatusCodeErrors,
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, DEFAULT_ENTITY_VERSION),
			enabled: !!payload,
			staleTime: 0,
			cacheTime: 0,
		})),
	);

	const topErrorsDataQuery = topErrorsDataQueries[0];
	const {
		data: topErrorsData,
		isLoading,
		isRefetching,
		isError,
		refetch,
	} = topErrorsDataQuery;

	const topErrorsColumnsConfig = useMemo(() => getTopErrorsColumnsConfig(), []);

	const formattedTopErrorsData = useMemo(
		() =>
			formatTopErrorsDataForTable(
				topErrorsData?.payload?.data?.result as TopErrorsResponseRow[],
			),
		[topErrorsData],
	);

	const endPointDropDownQueryPayload = useMemo(
		() => [
			getEndPointDetailsQueryPayload(domainName, minTime, maxTime, {
				items: [],
				op: 'AND',
			})[2],
		],
		[domainName, minTime, maxTime],
	);

	const endPointDropDownDataQueries = useQueries(
		endPointDropDownQueryPayload.map((payload) => ({
			queryKey: [
				END_POINT_DETAILS_QUERY_KEYS_ARRAY[4],
				payload,
				ENTITY_VERSION_V4,
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
			staleTime: 60 * 1000,
		})),
	);

	const [endPointDropDownDataQuery] = useMemo(
		() => [endPointDropDownDataQueries[0]],
		[endPointDropDownDataQueries],
	);

	const navigateToExplorer = useNavigateToExplorer();

	if (isError) {
		return (
			<div className="all-endpoints-error-state-wrapper">
				<ErrorState refetch={refetch} />
			</div>
		);
	}

	return (
		<div className="all-endpoints-container">
			<div className="top-errors-dropdown-container">
				<div className="endpoint-details-filters-container-dropdown">
					<EndPointsDropDown
						selectedEndPointName={endPointName}
						setSelectedEndPointName={setSelectedEndPointName}
						endPointDropDownDataQuery={endPointDropDownDataQuery}
						parentContainerDiv=".endpoint-details-filters-container"
					/>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<Switch
						checked={showStatusCodeErrors}
						onChange={setShowStatusCodeErrors}
						size="small"
					/>
					<span style={{ color: 'white', fontSize: '14px' }}>
						Status Message Exists
					</span>
					<Tooltip title="When enabled, shows errors that have a status message. When disabled, shows all errors regardless of status message">
						<Info size={16} color="white" />
					</Tooltip>
				</div>
			</div>

			<div className="endpoints-table-container">
				<div className="endpoints-table-header">
					{showStatusCodeErrors ? 'Errors with Status Message' : 'All Errors'}{' '}
					<Tooltip
						title={
							showStatusCodeErrors
								? 'Shows errors that have a status message'
								: 'Shows all errors regardless of status message'
						}
					>
						<Info size={16} color="white" />
					</Tooltip>
				</div>
				<Table
					columns={topErrorsColumnsConfig}
					loading={{
						spinning: isLoading || isRefetching,
						indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
					}}
					dataSource={isLoading || isRefetching ? [] : formattedTopErrorsData}
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
											{showStatusCodeErrors
												? 'Please disable "Status Message Exists" toggle to see all errors'
												: 'This query had no results. Edit your query and try again!'}
										</Typography.Text>
									</div>
								</div>
							),
					}}
					scroll={{ x: true }}
					tableLayout="fixed"
					rowClassName={(_, index): string =>
						index % 2 === 0 ? 'table-row-dark' : 'table-row-light'
					}
					onRow={(record): { onClick: () => void } => ({
						onClick: (): void => {
							const filters = getTopErrorsCoRelationQueryFilters(
								domainName,
								record.endpointName,
								record.statusCode,
							);
							navigateToExplorer({
								filters: [...filters.items],
								dataSource: DataSource.TRACES,
								startTime: minTime,
								endTime: maxTime,
								shouldResolveQuery: true,
							});
						},
					})}
				/>
			</div>
		</div>
	);
}

export default TopErrors;
