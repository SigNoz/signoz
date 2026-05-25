import { Color } from '@signozhq/design-tokens';
import { Button, Spin } from 'antd';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { useGetMetricHighlights } from 'api/generated/services/metrics';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { Info } from '@signozhq/icons';
import { useTimezone } from 'providers/Timezone';

import { formatNumberIntoHumanReadableFormat } from '../Summary/utils';
import { HighlightsProps } from './types';
import {
	formatNumberToCompactFormat,
	formatTimestampToReadableDate,
} from './utils';

const TOOLTIP_CONTENT_PROPS = {
	className: 'metric-highlights-tooltip-content',
};

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
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const lastReceivedTooltipText = metricHighlights?.lastReceived
		? `Last received on ${formatTimezoneAdjustedTimestamp(
				metricHighlights.lastReceived,
				DATE_TIME_FORMATS.DASH_DATETIME_UTC,
			)}`
		: 'No data received yet';

	if (isErrorMetricHighlights) {
		return (
			<div className="metric-details-content-grid">
				<div
					className="metric-highlights-error-state"
					data-testid="metric-highlights-error-state"
				>
					<Info size={16} color={Color.BG_CHERRY_500} />
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
				<Typography.Text color="muted" className="metric-details-grid-label">
					SAMPLES
				</Typography.Text>
				<Typography.Text color="muted" className="metric-details-grid-label">
					TIME SERIES
				</Typography.Text>
				<Typography.Text color="muted" className="metric-details-grid-label">
					LAST RECEIVED
				</Typography.Text>
			</div>
			<div className="values-row">
				{isLoadingMetricHighlights ? (
					<div className="metric-highlights-loading-inline">
						<Spin size="small" />
						<Typography.Text color="muted">Loading metric stats</Typography.Text>
					</div>
				) : (
					<>
						<Typography.Text
							className="metric-details-grid-value"
							data-testid="metric-highlights-data-points"
						>
							<TooltipSimple
								title={metricHighlights?.dataPoints?.toLocaleString()}
								tooltipContentProps={TOOLTIP_CONTENT_PROPS}
								arrow
							>
								<span>
									{formatNumberIntoHumanReadableFormat(
										metricHighlights?.dataPoints ?? 0,
									)}
								</span>
							</TooltipSimple>
						</Typography.Text>
						<Typography.Text
							className="metric-details-grid-value"
							data-testid="metric-highlights-time-series-total"
						>
							<TooltipSimple
								title="Active time series are those that have received data points in the last 1 hour."
								side="top"
								tooltipContentProps={TOOLTIP_CONTENT_PROPS}
								arrow
							>
								<span>{`${timeSeriesTotal} total ⎯ ${timeSeriesActive} active`}</span>
							</TooltipSimple>
						</Typography.Text>
						<Typography.Text
							className="metric-details-grid-value"
							data-testid="metric-highlights-last-received"
						>
							<TooltipSimple
								title={lastReceivedTooltipText}
								tooltipContentProps={TOOLTIP_CONTENT_PROPS}
								arrow
							>
								<span>{lastReceivedText}</span>
							</TooltipSimple>
						</Typography.Text>
					</>
				)}
			</div>
		</div>
	);
}

export default Highlights;
