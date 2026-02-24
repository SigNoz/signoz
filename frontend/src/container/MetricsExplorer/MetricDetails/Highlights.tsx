import { useMemo } from 'react';
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
			metricName: metricName ?? '',
		},
		{
			query: {
				enabled: !!metricName,
			},
		},
	);

	const metricHighlights = metricHighlightsData?.data ?? null;

	const dataPoints = useMemo(() => {
		if (!metricHighlights) {
			return null;
		}
		return (
			<Typography.Text className="metric-details-grid-value">
				<Tooltip title={metricHighlights?.dataPoints?.toLocaleString()}>
					{formatNumberIntoHumanReadableFormat(metricHighlights?.dataPoints ?? 0)}
				</Tooltip>
			</Typography.Text>
		);
	}, [metricHighlights]);

	const timeSeries = useMemo(() => {
		if (!metricHighlights) {
			return null;
		}
		const timeSeriesActive = formatNumberToCompactFormat(
			metricHighlights.activeTimeSeries,
		);
		const timeSeriesTotal = formatNumberToCompactFormat(
			metricHighlights.totalTimeSeries,
		);

		return (
			<Typography.Text className="metric-details-grid-value">
				<Tooltip
					title="Active time series are those that have received data points in the last 1
					hour."
					placement="top"
				>
					<span>{`${timeSeriesTotal} total ⎯ ${timeSeriesActive} active`}</span>
				</Tooltip>
			</Typography.Text>
		);
	}, [metricHighlights]);

	const lastReceived = useMemo(() => {
		if (!metricHighlights) {
			return null;
		}
		const displayText = formatTimestampToReadableDate(
			metricHighlights.lastReceived,
		);
		return (
			<Typography.Text className="metric-details-grid-value">
				<Tooltip title={displayText}>{displayText}</Tooltip>
			</Typography.Text>
		);
	}, [metricHighlights]);

	if (isLoadingMetricHighlights) {
		return (
			<div className="metric-details-content-grid">
				<Skeleton title={false} paragraph={{ rows: 2 }} active />
			</div>
		);
	}

	if (isErrorMetricHighlights) {
		return (
			<div className="metric-details-content-grid">
				<div className="metric-highlights-error-state">
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
				{dataPoints}
				{timeSeries}
				{lastReceived}
			</div>
		</div>
	);
}

export default Highlights;
