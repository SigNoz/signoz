import { useMemo } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Skeleton, Tooltip, Typography } from 'antd';
import { useGetMetricHighlights } from 'api/generated/services/metrics';

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

	const errorMessage = useMemo(
		() => (
			<Tooltip title="Error fetching metric highlights">
				<Typography.Text className="metric-details-grid-value">
					<InfoCircleOutlined size={16} color={Color.BG_CHERRY_500} />
				</Typography.Text>
			</Tooltip>
		),
		[],
	);

	const metricHighlights = useMemo(() => {
		return metricHighlightsData?.data?.data ?? null;
	}, [metricHighlightsData]);

	const dataPoints = useMemo(() => {
		if (!metricHighlights) {
			return null;
		}
		if (!isErrorMetricHighlights) {
			return errorMessage;
		}
		return (
			<Typography.Text className="metric-details-grid-value">
				<Tooltip title={metricHighlights?.dataPoints?.toLocaleString()}>
					{formatNumberIntoHumanReadableFormat(metricHighlights?.dataPoints ?? 0)}
				</Tooltip>
			</Typography.Text>
		);
	}, [metricHighlights, isErrorMetricHighlights, errorMessage]);

	const timeSeries = useMemo(() => {
		if (!metricHighlights) {
			return null;
		}
		if (isErrorMetricHighlights) {
			return errorMessage;
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
	}, [metricHighlights, isErrorMetricHighlights, errorMessage]);

	const lastReceived = useMemo(() => {
		if (!metricHighlights) {
			return null;
		}
		if (isErrorMetricHighlights) {
			return errorMessage;
		}
		const displayText = formatTimestampToReadableDate(
			metricHighlights.lastReceived,
		);
		return (
			<Typography.Text className="metric-details-grid-value">
				<Tooltip title={displayText}>{displayText}</Tooltip>
			</Typography.Text>
		);
	}, [metricHighlights, isErrorMetricHighlights, errorMessage]);

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
