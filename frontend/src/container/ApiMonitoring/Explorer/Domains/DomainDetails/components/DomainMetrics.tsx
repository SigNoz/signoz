import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { Skeleton, Tooltip } from 'antd';
import { Progress } from '@signozhq/ui/progress';
import { Typography } from '@signozhq/ui/typography';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	DomainMetricsResponseRow,
	formatDomainMetricsDataForTable,
	getDomainMetricsQueryPayload,
} from 'container/ApiMonitoring/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import ErrorState from './ErrorState';

function DomainMetrics({
	domainName,
	timeRange,
	domainListFilterExpression,
}: {
	domainName: string;
	timeRange: { startTime: number; endTime: number };
	domainListFilterExpression: string;
}): JSX.Element {
	const { startTime: minTime, endTime: maxTime } = timeRange;

	const queryPayloads = useMemo(
		() =>
			getDomainMetricsQueryPayload(
				domainName,
				minTime,
				maxTime,
				domainListFilterExpression,
			),
		[domainName, minTime, maxTime, domainListFilterExpression],
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
		<div className="domain-detail-drawer__endpoint" data-testid="domain-metrics">
			<div className="domain-details-grid">
				<div className="labels-row">
					<Typography
						variant="uppercase"
						size="small"
						weight="medium"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						EXTERNAL API
					</Typography>
					<Typography
						variant="uppercase"
						size="small"
						weight="medium"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						AVERAGE LATENCY
					</Typography>
					<Typography
						variant="uppercase"
						size="small"
						weight="medium"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						ERROR %
					</Typography>
					<Typography
						variant="uppercase"
						size="small"
						weight="medium"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						LAST USED
					</Typography>
				</div>

				<div className="values-row" data-testid="domain-metrics-values">
					<div className="domain-details-metadata-value">
						<Typography
							variant="code"
							size="small"
							weight="medium"
							color="secondary"
							as="span"
							textOverflow="visible"
						>
							{isLoading || isRefetching ? (
								<Skeleton.Button active size="small" />
							) : (
								<Tooltip title={formattedDomainMetricsData.endpointCount}>
									<span className="round-metric-tag">
										{formattedDomainMetricsData.endpointCount}
									</span>
								</Tooltip>
							)}
						</Typography>
					</div>
					{/* // update the tooltip as well */}
					<div className="domain-details-metadata-value">
						<Typography
							variant="code"
							size="small"
							weight="medium"
							color="secondary"
							as="span"
							textOverflow="visible"
						>
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
						</Typography>
					</div>
					{/* // update the tooltip as well */}
					<div className="domain-details-metadata-value error-rate">
						<Typography
							variant="code"
							size="small"
							weight="medium"
							color="secondary"
							as="span"
							textOverflow="visible"
						>
							{isLoading || isRefetching ? (
								<Skeleton.Button active size="small" />
							) : (
								<Tooltip title={formattedDomainMetricsData.errorRate}>
									{formattedDomainMetricsData.errorRate !== '-' ? (
										<div className="progress-bar">
											<Progress
												percent={Number(
													Number(formattedDomainMetricsData.errorRate).toFixed(2),
												)}
												showInfo
												color={
													Number(formattedDomainMetricsData.errorRate) >= 90
														? 'highlight-danger'
														: Number(formattedDomainMetricsData.errorRate) >= 60
															? 'warning'
															: 'success'
												}
											/>
										</div>
									) : (
										'-'
									)}
								</Tooltip>
							)}
						</Typography>
					</div>
					<div className="domain-details-metadata-value">
						<Typography
							variant="code"
							size="small"
							weight="medium"
							color="secondary"
							as="span"
							textOverflow="visible"
						>
							{isLoading || isRefetching ? (
								<Skeleton.Button active size="small" />
							) : (
								<Tooltip title={formattedDomainMetricsData.lastUsed}>
									{formattedDomainMetricsData.lastUsed}
								</Tooltip>
							)}
						</Typography>
					</div>
				</div>
			</div>
		</div>
	);
}

export default DomainMetrics;
