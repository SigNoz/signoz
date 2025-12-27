import { Skeleton, Tooltip, Typography } from 'antd';
import { useGetMetricHighlights } from 'hooks/metricsExplorer/v2/useGetMetricHighlights';
import { useMemo } from 'react';

import { formatNumberIntoHumanReadableFormat } from '../Summary/utils';
import { HighlightsProps } from './types';
import {
	formatNumberToCompactFormat,
	formatTimestampToReadableDate,
	transformMetricHighlights,
} from './utils';

function Highlights({ metricName }: HighlightsProps): JSX.Element {
	const {
		data: metricHighlightsData,
		isLoading: isLoadingMetricHighlights,
		isError: isErrorMetricHighlights,
	} = useGetMetricHighlights(metricName ?? '', {
		enabled: !!metricName,
	});

	const metricHighlights = transformMetricHighlights(metricHighlightsData);

	const dataPoints = useMemo(() => {
		if (!metricHighlights) return null;
		if (isErrorMetricHighlights) {
			return (
				<Typography.Text className="metric-details-grid-value">-</Typography.Text>
			);
		}
		return (
			<Typography.Text className="metric-details-grid-value">
				<Tooltip title={metricHighlights?.dataPoints.toLocaleString()}>
					{formatNumberIntoHumanReadableFormat(metricHighlights?.dataPoints ?? 0)}
				</Tooltip>
			</Typography.Text>
		);
	}, [metricHighlights, isErrorMetricHighlights]);

	const timeSeries = useMemo(() => {
		if (!metricHighlights) return null;
		if (isErrorMetricHighlights) {
			return (
				<Typography.Text className="metric-details-grid-value">-</Typography.Text>
			);
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
	}, [metricHighlights, isErrorMetricHighlights]);

	const lastReceived = useMemo(() => {
		if (!metricHighlights) return null;
		if (isErrorMetricHighlights) {
			return (
				<Typography.Text className="metric-details-grid-value">-</Typography.Text>
			);
		}
		const displayText = formatTimestampToReadableDate(
			metricHighlights.lastReceived,
		);
		return (
			<Typography.Text className="metric-details-grid-value">
				<Tooltip title={displayText}>{displayText}</Tooltip>
			</Typography.Text>
		);
	}, [metricHighlights, isErrorMetricHighlights]);

	if (isLoadingMetricHighlights) {
		return (
			<div className="metric-details-content-grid">
				<Skeleton title={false} paragraph={{ rows: 2 }} active />
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
