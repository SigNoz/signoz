import { Color } from '@signozhq/design-tokens';
import { Progress, Skeleton, Tooltip, Typography } from 'antd';
import { getFormattedEndPointMetricsData } from 'container/ApiMonitoring/utils';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

import ErrorState from './ErrorState';

function EndPointMetrics({
	endPointMetricsDataQuery,
}: {
	endPointMetricsDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
}): JSX.Element {
	const {
		isLoading,
		isRefetching,
		isError,
		data,
		refetch,
	} = endPointMetricsDataQuery;

	const metricsData = useMemo(() => {
		if (isLoading || isRefetching || isError) {
			return null;
		}

		return getFormattedEndPointMetricsData(
			data?.payload?.data?.result[0].table.rows,
		);
	}, [data?.payload?.data?.result, isLoading, isRefetching, isError]);

	if (isError) {
		return <ErrorState refetch={refetch} />;
	}

	return (
		<div className="domain-detail-drawer__endpoint">
			<div className="domain-details-grid">
				<div className="labels-row">
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						Rate
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
						ERROR RATE
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
							<Tooltip title={metricsData?.rate}>
								<span className="round-metric-tag">{metricsData?.rate} ops/sec</span>
							</Tooltip>
						)}
					</Typography.Text>
					<Typography.Text className="domain-details-metadata-value">
						{isLoading || isRefetching ? (
							<Skeleton.Button active size="small" />
						) : (
							<Tooltip title={metricsData?.latency}>
								<span className="round-metric-tag">{metricsData?.latency}ms</span>
							</Tooltip>
						)}
					</Typography.Text>
					<Typography.Text className="domain-details-metadata-value error-rate">
						{isLoading || isRefetching ? (
							<Skeleton.Button active size="small" />
						) : (
							<Tooltip title={metricsData?.errorRate}>
								<Progress
									percent={Number((metricsData?.errorRate ?? 0 * 100).toFixed(1))}
									strokeLinecap="butt"
									size="small"
									strokeColor={((): string => {
										const errorRatePercent = Number(
											(metricsData?.errorRate ?? 0 * 100).toFixed(1),
										);
										if (errorRatePercent >= 90) return Color.BG_SAKURA_500;
										if (errorRatePercent >= 60) return Color.BG_AMBER_500;
										return Color.BG_FOREST_500;
									})()}
									className="progress-bar"
								/>
							</Tooltip>
						)}
					</Typography.Text>
					<Typography.Text className="domain-details-metadata-value">
						{isLoading || isRefetching ? (
							<Skeleton.Button active size="small" />
						) : (
							<Tooltip title={metricsData?.lastUsed}>{metricsData?.lastUsed}</Tooltip>
						)}
					</Typography.Text>
				</div>
			</div>
		</div>
	);
}

export default EndPointMetrics;
