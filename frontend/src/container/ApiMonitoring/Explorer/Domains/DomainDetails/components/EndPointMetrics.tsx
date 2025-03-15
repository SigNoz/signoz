import { Tooltip, Typography } from 'antd';
import { getFormattedEndPointMetricsData } from 'container/ApiMonitoring/utils';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

function EndPointMetrics({
	endPointMetricsDataQuery,
}: {
	endPointMetricsDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
}): JSX.Element {
	const { isLoading, isRefetching, isError, data } = endPointMetricsDataQuery;

	const metricsData = useMemo(() => {
		if (isLoading || isRefetching || isError) {
			return null;
		}

		return getFormattedEndPointMetricsData(
			data?.payload?.data?.result[0].table.rows,
		);
	}, [data?.payload?.data?.result, isLoading, isRefetching, isError]);

	// show appropriate loaders based on loading state
	if (isLoading || isRefetching) {
		return <div>Loading...</div>;
	}

	return (
		<div className="entity-detail-drawer__entity">
			<div className="entity-details-grid">
				<div className="labels-row">
					<Typography.Text
						type="secondary"
						className="entity-details-metadata-label"
					>
						Rate
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="entity-details-metadata-label"
					>
						AVERAGE LATENCY
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="entity-details-metadata-label"
					>
						ERROR RATE
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="entity-details-metadata-label"
					>
						LAST USED
					</Typography.Text>
				</div>

				<div className="values-row">
					<Typography.Text className="entity-details-metadata-value">
						<Tooltip title={metricsData?.rate}>{metricsData?.rate}</Tooltip>
					</Typography.Text>
					<Typography.Text className="entity-details-metadata-value">
						<Tooltip title={metricsData?.latency}>{metricsData?.latency}</Tooltip>
					</Typography.Text>
					<Typography.Text className="entity-details-metadata-value">
						<Tooltip title={metricsData?.errorRate}>{metricsData?.errorRate}</Tooltip>
					</Typography.Text>
					<Typography.Text className="entity-details-metadata-value">
						<Tooltip title={metricsData?.lastUsed}>{metricsData?.lastUsed}</Tooltip>
					</Typography.Text>
				</div>
			</div>
		</div>
	);
}

export default EndPointMetrics;
