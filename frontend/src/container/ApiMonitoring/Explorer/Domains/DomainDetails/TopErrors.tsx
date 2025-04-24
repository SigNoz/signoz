import { LoadingOutlined } from '@ant-design/icons';
import { Spin, Table, Typography } from 'antd';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	formatTopErrorsDataForTable,
	getTopErrorsColumnsConfig,
	getTopErrorsQueryPayload,
	TopErrorsResponseRow,
} from 'container/ApiMonitoring/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import ErrorState from './components/ErrorState';

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

	const queryPayloads = useMemo(
		() => getTopErrorsQueryPayload(domainName, minTime, maxTime),
		[domainName, minTime, maxTime],
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

	if (isError) {
		return (
			<div className="all-endpoints-error-state-wrapper">
				<ErrorState refetch={refetch} />
			</div>
		);
	}

	console.log('uncaught topErrors Data', formattedTopErrorsData);

	return (
		<div className="all-endpoints-container">
			<div className="endpoints-table-container">
				<div className="endpoints-table-header">Top Errors</div>
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
