import { LoadingOutlined } from '@ant-design/icons';
import { Spin, Table, Tooltip, Typography } from 'antd';
import { DEFAULT_ENTITY_VERSION, ENTITY_VERSION_V4 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	END_POINT_DETAILS_QUERY_KEYS_ARRAY,
	formatTopErrorsDataForTable,
	getEndPointDetailsQueryPayload,
	getTopErrorsColumnsConfig,
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

import EndPointsDropDown from './components/EndPointsDropDown';
import ErrorState from './components/ErrorState';
import { SPAN_ATTRIBUTES } from './constants';

function TopErrors({
	domainName,
	timeRange,
}: {
	domainName: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
}): JSX.Element {
	const { startTime: minTime, endTime: maxTime } = timeRange;

	const [endPointName, setSelectedEndPointName] = useState<string>('');

	const queryPayloads = useMemo(
		() =>
			getTopErrorsQueryPayload(domainName, minTime, maxTime, {
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
					  ]
					: [],
				op: 'AND',
			}),
		[domainName, endPointName, minTime, maxTime],
	);

	// Since only one query here
	const topErrorsDataQueries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: [
				REACT_QUERY_KEY.GET_TOP_ERRORS_BY_DOMAIN,
				payload,
				DEFAULT_ENTITY_VERSION,
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, DEFAULT_ENTITY_VERSION),
			enabled: !!payload,
			staleTime: 60 * 1000, // 1 minute stale time : optimize this part
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
			staleTime: 60 * 1000, // 1 minute stale time : optimize this part
		})),
	);

	const [endPointDropDownDataQuery] = useMemo(
		() => [endPointDropDownDataQueries[0]],
		[endPointDropDownDataQueries],
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
			<div className="top-errors-dropdown-container">
				<div className="endpoint-details-filters-container-dropdown">
					<EndPointsDropDown
						selectedEndPointName={endPointName}
						setSelectedEndPointName={setSelectedEndPointName}
						endPointDropDownDataQuery={endPointDropDownDataQuery}
						parentContainerDiv=".endpoint-details-filters-container"
					/>
				</div>
				<Tooltip title="Optionally select a specific endpoint to see status message if present">
					<Info size={16} color="white" />
				</Tooltip>
			</div>

			<div className="endpoints-table-container">
				<div className="endpoints-table-header">
					Top Errors{' '}
					<Tooltip title="Shows top 10 errors only when status message is propagated">
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
											This query had no results. Edit your query and try again!
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
				/>
			</div>
		</div>
	);
}

export default TopErrors;
