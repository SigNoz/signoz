import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { Skeleton, Tooltip } from 'antd';
import { Progress } from '@signozhq/ui/progress';
import { Typography } from '@signozhq/ui/typography';
import {
	getDisplayValue,
	getFormattedEndPointMetricsData,
} from 'container/ApiMonitoring/utils';
import { SuccessResponse } from 'types/api';

import ErrorState from './ErrorState';

// eslint-disable-next-line sonarjs/cognitive-complexity
function EndPointMetrics({
	endPointMetricsDataQuery,
}: {
	endPointMetricsDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
}): JSX.Element {
	const { isLoading, isRefetching, isError, data, refetch } =
		endPointMetricsDataQuery;

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
					<Typography
						variant="uppercase"
						size="small"
						weight="medium"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						Rate
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

				<div className="values-row">
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
								<Tooltip title={metricsData?.rate}>
									<span className="round-metric-tag">
										{metricsData?.rate !== '-' ? `${metricsData?.rate} ops/sec` : '-'}
									</span>
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
								<Tooltip title={metricsData?.latency}>
									{metricsData?.latency !== '-' ? `${metricsData?.latency}ms` : '-'}
								</Tooltip>
							)}
						</Typography>
					</div>
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
								<Tooltip title={metricsData?.errorRate}>
									{metricsData?.errorRate !== '-' ? (
										<div className="progress-bar">
											<Progress
												percent={Number(Number(metricsData?.errorRate ?? 0).toFixed(2))}
												showInfo
												color={
													Number(metricsData?.errorRate ?? 0) >= 90
														? 'highlight-danger'
														: Number(metricsData?.errorRate ?? 0) >= 60
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
								<Tooltip title={metricsData?.lastUsed}>
									{getDisplayValue(metricsData?.lastUsed)}
								</Tooltip>
							)}
						</Typography>
					</div>
				</div>
			</div>
		</div>
	);
}

export default EndPointMetrics;
