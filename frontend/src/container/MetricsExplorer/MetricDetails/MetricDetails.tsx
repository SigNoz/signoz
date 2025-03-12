import './MetricDetails.styles.scss';
import '../Summary/Summary.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Divider,
	Drawer,
	Empty,
	Skeleton,
	Tooltip,
	Typography,
} from 'antd';
import ROUTES from 'constants/routes';
import { useGetMetricDetails } from 'hooks/metricsExplorer/useGetMetricDetails';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Compass, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import AllAttributes from './AllAttributes';
import DashboardsAndAlertsPopover from './DashboardsAndAlertsPopover';
import Metadata from './Metadata';
import TopAttributes from './TopAttributes';
import { MetricDetailsProps } from './types';
import {
	formatNumberToCompactFormat,
	formatTimestampToReadableDate,
	getMetricDetailsQuery,
} from './utils';

function MetricDetails({
	onClose,
	isOpen,
	metricName,
}: MetricDetailsProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { safeNavigate } = useSafeNavigate();

	const {
		data,
		isLoading,
		isFetching,
		error: metricDetailsError,
		refetch: refetchMetricDetails,
	} = useGetMetricDetails(metricName ?? '', {
		enabled: !!metricName,
	});

	const metric = data?.payload?.data;

	const lastReceived = useMemo(() => {
		if (!metric) return null;
		return formatTimestampToReadableDate(metric.lastReceived);
	}, [metric]);

	const isMetricDetailsLoading = isLoading || isFetching;

	const timeSeries = useMemo(() => {
		if (!metric) return null;
		const timeSeriesActive = formatNumberToCompactFormat(metric.timeSeriesActive);
		const timeSeriesTotal = formatNumberToCompactFormat(metric.timeSeriesTotal);
		return `${timeSeriesActive} ⎯ ${timeSeriesTotal} active`;
	}, [metric]);

	const goToMetricsExplorerwithSelectedMetric = useCallback(() => {
		if (metricName) {
			const compositeQuery = getMetricDetailsQuery(metricName);
			const encodedCompositeQuery = JSON.stringify(compositeQuery);
			safeNavigate(
				`${ROUTES.METRICS_EXPLORER_EXPLORER}?compositeQuery=${encodedCompositeQuery}`,
			);
		}
	}, [metricName, safeNavigate]);

	const top5Attributes = useMemo(() => {
		if (!metric) return [];
		const totalSum =
			metric?.attributes.reduce((acc, curr) => acc + curr.valueCount, 0) || 0;
		return metric?.attributes.slice(0, 5).map((attr) => ({
			key: attr.key,
			count: attr.valueCount,
			percentage: totalSum === 0 ? 0 : (attr.valueCount / totalSum) * 100,
		}));
	}, [metric]);

	const isMetricDetailsError = metricDetailsError || !metric;

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
						disabled={!metricName}
					>
						Open in Explorer
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
			closeIcon={<X size={16} />}
		>
			{isMetricDetailsLoading && <Skeleton active />}
			{isMetricDetailsError && !isMetricDetailsLoading && (
				<Empty description="Error fetching metric details" />
			)}
			{!isMetricDetailsLoading && !isMetricDetailsError && (
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
					<TopAttributes items={top5Attributes} title="Top 5 Attributes" />
					<Metadata
						metricName={metric?.name}
						metadata={metric.metadata}
						refetchMetricDetails={refetchMetricDetails}
					/>
					<AllAttributes metricName={metric?.name} attributes={metric.attributes} />
				</div>
			)}
		</Drawer>
	);
}

export default MetricDetails;
