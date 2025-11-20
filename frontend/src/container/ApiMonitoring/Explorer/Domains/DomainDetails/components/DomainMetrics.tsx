import { Color } from '@signozhq/design-tokens';
import { Progress, Skeleton, Tooltip, Typography } from 'antd';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	DomainMetricsResponseRow,
	formatDomainMetricsDataForTable,
	getDomainMetricsQueryPayload,
} from 'container/ApiMonitoring/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import ErrorState from './ErrorState';

function DomainMetrics({
	domainName,
	timeRange,
	domainListFilters,
}: {
	domainName: string;
	timeRange: { startTime: number; endTime: number };
	domainListFilters: IBuilderQuery['filters'];
}): JSX.Element {
	const { startTime: minTime, endTime: maxTime } = timeRange;

	const queryPayloads = useMemo(
		() =>
			getDomainMetricsQueryPayload(
				domainName,
				minTime,
				maxTime,
				domainListFilters,
			),
		[domainName, minTime, maxTime, domainListFilters],
	);

	// Since only one query here
	const domainMetricsDataQueries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: [
				REACT_QUERY_KEY.GET_DOMAIN_METRICS_DATA,
				payload,
				ENTITY_VERSION_V5,
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V5),
			enabled: !!payload,
			staleTime: 60 * 1000, // 1 minute stale time : optimize this part
		})),
	);

	const domainMetricsDataQuery = domainMetricsDataQueries[0];
	// [TODO] handle the case where the data is not available
	// [TODO] Format the data properly
	const {
		data: domainMetricsData,
		isLoading,
		isRefetching,
		isError,
		refetch,
	} = domainMetricsDataQuery;

	// [TODO] Fix type error
	const formattedDomainMetricsData = useMemo(() => {
		// Safely access the data with proper type checking
		const rowData = domainMetricsData?.payload?.data?.result[0]?.table?.rows[0];

		// Only pass the data if it matches the expected format
		return formatDomainMetricsDataForTable(
			rowData as DomainMetricsResponseRow | undefined,
		);
	}, [domainMetricsData]);

	if (isError) {
		return (
			<div className="all-endpoints-error-state-wrapper">
				<ErrorState refetch={refetch} />
			</div>
		);
	}

	return (
		<div className="domain-detail-drawer__endpoint">
			<div className="domain-details-grid">
				<div className="labels-row">
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						EXTERNAL API
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						AVERAGE LATENCY
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						ERROR %
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						LAST USED
					</Typography.Text>
				</div>

				<div className="values-row">
					<Typography.Text className="domain-details-metadata-value">
						{isLoading || isRefetching ? (
							<Skeleton.Button active size="small" />
						) : (
							<Tooltip title={formattedDomainMetricsData.endpointCount}>
								<span className="round-metric-tag">
									{formattedDomainMetricsData.endpointCount}
								</span>
							</Tooltip>
						)}
					</Typography.Text>
					{/* // update the tooltip as well */}
					<Typography.Text className="domain-details-metadata-value">
						{isLoading || isRefetching ? (
							<Skeleton.Button active size="small" />
						) : (
							<Tooltip title={formattedDomainMetricsData.latency}>
								<span className="round-metric-tag">
									{formattedDomainMetricsData.latency !== '-'
										? `${(Number(formattedDomainMetricsData.latency) / 1000).toFixed(3)}s`
										: '-'}
								</span>
							</Tooltip>
						)}
					</Typography.Text>
					{/* // update the tooltip as well */}
					<Typography.Text className="domain-details-metadata-value error-rate">
						{isLoading || isRefetching ? (
							<Skeleton.Button active size="small" />
						) : (
							<Tooltip title={formattedDomainMetricsData.errorRate}>
								{formattedDomainMetricsData.errorRate !== '-' ? (
									<Progress
										status="active"
										percent={Number(
											Number(formattedDomainMetricsData.errorRate).toFixed(2),
										)}
										strokeLinecap="butt"
										size="small"
										strokeColor={((): string => {
											const errorRatePercent = Number(
												Number(formattedDomainMetricsData.errorRate).toFixed(2),
											);
											if (errorRatePercent >= 90) return Color.BG_SAKURA_500;
											if (errorRatePercent >= 60) return Color.BG_AMBER_500;
											return Color.BG_FOREST_500;
										})()}
										className="progress-bar"
									/>
								) : (
									'-'
								)}
							</Tooltip>
						)}
					</Typography.Text>
					<Typography.Text className="domain-details-metadata-value">
						{isLoading || isRefetching ? (
							<Skeleton.Button active size="small" />
						) : (
							<Tooltip title={formattedDomainMetricsData.lastUsed}>
								{formattedDomainMetricsData.lastUsed}
							</Tooltip>
						)}
					</Typography.Text>
				</div>
			</div>
		</div>
	);
}

export default DomainMetrics;
