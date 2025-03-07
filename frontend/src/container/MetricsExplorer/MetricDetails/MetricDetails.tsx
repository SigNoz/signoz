import './MetricDetails.styles.scss';
import '../Summary/Summary.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Skeleton, Tooltip, Typography } from 'antd';
import { useGetMetricDetails } from 'hooks/metricsExplorer/useGetMetricDetails';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import AllAttributes from './AllAttributes';
import DashboardsAndAlertsPopover from './DashboardsAndAlertsPopover';
import Metadata from './Metadata';
import { MetricDetailsProps } from './types';
import {
	formatNumberToCompactFormat,
	formatTimestampToReadableDate,
} from './utils';

function MetricDetails({
	onClose,
	isOpen,
	metricName,
}: MetricDetailsProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const {
		data,
		isLoading,
		isFetching,
		refetch: refetchMetricDetails,
	} = useGetMetricDetails(metricName ?? '', {
		enabled: !!metricName,
	});

	const metric = data?.payload?.data;

	const lastReceived = useMemo(() => {
		if (!metric) return null;
		return formatTimestampToReadableDate(metric.lastReceived);
	}, [metric]);

	const isMetricDetailsLoading = isLoading || isFetching || !metric;

	const timeSeries = useMemo(() => {
		if (!metric) return null;
		const timeSeriesActive = formatNumberToCompactFormat(metric.timeSeriesActive);
		const timeSeriesTotal = formatNumberToCompactFormat(metric.timeSeriesTotal);
		return `${timeSeriesActive} ⎯ ${timeSeriesTotal} active`;
	}, [metric]);

	const goToMetricsExplorerwithSelectedMetric = useCallback(() => {
		// TODO: Implement this when explore page is ready
		console.log(metricName);
	}, [metricName]);

	return (
		<Drawer
			width="60%"
			title={
				<div className="metric-details-header">
					<div className="metric-details-title">
						<Divider type="vertical" />
						<Typography.Text>{metric?.name}</Typography.Text>
					</div>
					<Button
						onClick={goToMetricsExplorerwithSelectedMetric}
						icon={<Compass size={16} />}
					>
						<Typography.Text>Open in Explorer</Typography.Text>
					</Button>
				</div>
			}
			placement="right"
			onClose={onClose}
			open={isOpen}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="metric-details-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{isMetricDetailsLoading ? (
				<Skeleton active />
			) : (
				<div className="metric-details-content">
					<div className="metric-details-content-grid">
						<div className="labels-row">
							<Typography.Text type="secondary" className="metric-details-grid-label">
								DATAPOINTS
							</Typography.Text>
							<Typography.Text type="secondary" className="metric-details-grid-label">
								TIME SERIES
							</Typography.Text>
							<Typography.Text type="secondary" className="metric-details-grid-label">
								LAST RECEIVED
							</Typography.Text>
						</div>
						<div className="values-row">
							<Typography.Text className="metric-details-grid-value">
								<Tooltip title={metric?.samples}>
									{metric?.samples.toLocaleString()}
								</Tooltip>
							</Typography.Text>
							<Typography.Text className="metric-details-grid-value">
								<Tooltip title={timeSeries}>{timeSeries}</Tooltip>
							</Typography.Text>
							<Typography.Text className="metric-details-grid-value">
								<Tooltip title={lastReceived}>{lastReceived}</Tooltip>
							</Typography.Text>
						</div>
					</div>
					<DashboardsAndAlertsPopover
						dashboards={metric.dashboards}
						alerts={metric.alerts}
					/>
					<div>
						<Metadata
							metricName={metric?.name}
							metadata={metric.metadata}
							refetchMetricDetails={refetchMetricDetails}
						/>
						<AllAttributes metricName={metric?.name} attributes={metric.attributes} />
					</div>
				</div>
			)}
		</Drawer>
	);
}

export default MetricDetails;
