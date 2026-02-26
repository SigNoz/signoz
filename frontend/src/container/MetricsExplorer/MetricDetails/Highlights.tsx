import { Color } from '@signozhq/design-tokens';
import { Button, Skeleton, Tooltip, Typography } from 'antd';
import { useGetMetricHighlights } from 'api/generated/services/metrics';
import { InfoIcon } from 'lucide-react';

import { formatNumberIntoHumanReadableFormat } from '../Summary/utils';
import { HighlightsProps } from './types';
import {
	formatNumberToCompactFormat,
	formatTimestampToReadableDate,
} from './utils';

function Highlights({ metricName }: HighlightsProps): JSX.Element {
	const {
		data: metricHighlightsData,
		isLoading: isLoadingMetricHighlights,
		isError: isErrorMetricHighlights,
		refetch: refetchMetricHighlights,
	} = useGetMetricHighlights(
		{
			metricName,
		},
		{
			query: {
				enabled: !!metricName,
			},
		},
	);

	const metricHighlights = metricHighlightsData?.data;

	const timeSeriesActive = formatNumberToCompactFormat(
		metricHighlights?.activeTimeSeries,
	);
	const timeSeriesTotal = formatNumberToCompactFormat(
		metricHighlights?.totalTimeSeries,
	);
	const lastReceivedText = formatTimestampToReadableDate(
		metricHighlights?.lastReceived,
	);

	if (isLoadingMetricHighlights) {
		return (
			<div
				className="metric-details-content-grid"
				data-testid="metric-highlights-loading-state"
			>
				<Skeleton title={false} paragraph={{ rows: 2 }} active />
			</div>
		);
	}

	if (isErrorMetricHighlights) {
		return (
			<div className="metric-details-content-grid">
				<div
					className="metric-highlights-error-state"
					data-testid="metric-highlights-error-state"
				>
					<InfoIcon size={16} color={Color.BG_CHERRY_500} />
					<Typography.Text>
						Something went wrong while fetching metric highlights
					</Typography.Text>
					<Button
						type="link"
						size="large"
						onClick={(): void => {
							refetchMetricHighlights();
						}}
					>
						Retry ?
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="metric-details-content-grid">
			<div className="labels-row">
				<Typography.Text type="secondary" className="metric-details-grid-label">
					SAMPLES
				</Typography.Text>
				<Typography.Text type="secondary" className="metric-details-grid-label">
					TIME SERIES
				</Typography.Text>
				<Typography.Text type="secondary" className="metric-details-grid-label">
					LAST RECEIVED
				</Typography.Text>
			</div>
			<div className="values-row">
				<Typography.Text
					className="metric-details-grid-value"
					data-testid="metric-highlights-data-points"
				>
					<Tooltip title={metricHighlights?.dataPoints?.toLocaleString()}>
						{formatNumberIntoHumanReadableFormat(metricHighlights?.dataPoints ?? 0)}
					</Tooltip>
				</Typography.Text>
				<Typography.Text
					className="metric-details-grid-value"
					data-testid="metric-highlights-time-series-total"
				>
					<Tooltip
						title="Active time series are those that have received data points in the last 1
					hour."
						placement="top"
					>
						<span>{`${timeSeriesTotal} total ⎯ ${timeSeriesActive} active`}</span>
					</Tooltip>
				</Typography.Text>
				<Typography.Text
					className="metric-details-grid-value"
					data-testid="metric-highlights-last-received"
				>
					<Tooltip title={lastReceivedText}>{lastReceivedText}</Tooltip>
				</Typography.Text>
			</div>
		</div>
	);
}

export default Highlights;
