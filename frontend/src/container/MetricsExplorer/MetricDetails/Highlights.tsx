import { Color } from '@signozhq/design-tokens';
import { Button, Spin } from 'antd';
import { Tooltip } from '@signozhq/ui/tooltip';
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						Something went wrong while fetching metric highlights
					</Typography>
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
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					SAMPLES
				</Typography>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					TIME SERIES
				</Typography>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					LAST RECEIVED
				</Typography>
			</div>
			<div className="values-row">
				{isLoadingMetricHighlights ? (
					<div className="metric-highlights-loading-inline">
						<Spin size="small" />
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							Loading metric stats
						</Typography>
					</div>
				) : (
					<>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							data-testid="metric-highlights-data-points"
						>
							<Tooltip title={metricHighlights?.dataPoints?.toLocaleString()}>
								<span>
									{formatNumberIntoHumanReadableFormat(
										metricHighlights?.dataPoints ?? 0,
									)}
								</span>
							</Tooltip>
						</Typography>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							data-testid="metric-highlights-time-series-total"
						>
							<Tooltip
								title="Active time series are those that have received data points in the last 1 hour."
								side="top"
							>
								<span>{`${timeSeriesTotal} total ⎯ ${timeSeriesActive} active`}</span>
							</Tooltip>
						</Typography>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							data-testid="metric-highlights-last-received"
						>
							<Tooltip title={lastReceivedTooltipText}>
								<span>{lastReceivedText}</span>
							</Tooltip>
						</Typography>
					</>
				)}
			</div>
		</div>
	);
}

export default Highlights;
