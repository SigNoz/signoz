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
import logEvent from 'api/common/logEvent';
import { useGetMetricDetails } from 'hooks/metricsExplorer/useGetMetricDetails';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass, Crosshair, X } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';

import { PANEL_TYPES } from '../../../constants/queryBuilder';
import ROUTES from '../../../constants/routes';
import { useHandleExplorerTabChange } from '../../../hooks/useHandleExplorerTabChange';
import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import { isInspectEnabled } from '../Inspect/utils';
import { formatNumberIntoHumanReadableFormat } from '../Summary/utils';
import AllAttributes from './AllAttributes';
import DashboardsAndAlertsPopover from './DashboardsAndAlertsPopover';
import Metadata from './Metadata';
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
	openInspectModal,
}: MetricDetailsProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { handleExplorerTabChange } = useHandleExplorerTabChange();

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

	const showInspectFeature = useMemo(
		() => isInspectEnabled(metric?.metadata?.metric_type),
		[metric],
	);

	const isMetricDetailsLoading = isLoading || isFetching;

	const timeSeries = useMemo(() => {
		if (!metric) return null;
		const timeSeriesActive = formatNumberToCompactFormat(metric.timeSeriesActive);
		const timeSeriesTotal = formatNumberToCompactFormat(metric.timeSeriesTotal);

		return (
			<Tooltip
				title="Active time series are those that have received data points in the last 1
					hour."
				placement="top"
			>
				<span>{`${timeSeriesTotal} total ⎯ ${timeSeriesActive} active`}</span>
			</Tooltip>
		);
	}, [metric]);

	const goToMetricsExplorerwithSelectedMetric = useCallback(() => {
		if (metricName) {
			const compositeQuery = getMetricDetailsQuery(
				metricName,
				metric?.metadata?.metric_type,
			);
			handleExplorerTabChange(
				PANEL_TYPES.TIME_SERIES,
				{
					query: compositeQuery,
					name: metricName,
					id: metricName,
				},
				ROUTES.METRICS_EXPLORER_EXPLORER,
			);
			logEvent(MetricsExplorerEvents.OpenInExplorerClicked, {
				[MetricsExplorerEventKeys.MetricName]: metricName,
				[MetricsExplorerEventKeys.Tab]: 'summary',
				[MetricsExplorerEventKeys.Modal]: 'metric-details',
			});
		}
	}, [metricName, handleExplorerTabChange, metric?.metadata?.metric_type]);

	const isMetricDetailsError = metricDetailsError || !metric;

	useEffect(() => {
		logEvent(MetricsExplorerEvents.ModalOpened, {
			[MetricsExplorerEventKeys.Modal]: 'metric-details',
		});
	}, []);

	return (
		<Drawer
			width="60%"
			title={
				<div className="metric-details-header">
					<div className="metric-details-title">
						<Divider type="vertical" />
						<Typography.Text>{metric?.name}</Typography.Text>
					</div>
					<div className="metric-details-header-buttons">
						<Button
							onClick={goToMetricsExplorerwithSelectedMetric}
							icon={<Compass size={16} />}
							disabled={!metricName}
							data-testid="open-in-explorer-button"
						>
							Open in Explorer
						</Button>
						{/* Show the based on the feature flag. Will remove before releasing the feature */}
						{showInspectFeature && (
							<Button
								className="inspect-metrics-button"
								aria-label="Inspect Metric"
								icon={<Crosshair size={18} />}
								onClick={(): void => {
									if (metric?.name) {
										openInspectModal(metric.name);
									}
								}}
								data-testid="inspect-metric-button"
							/>
						)}
					</div>
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
			{isMetricDetailsLoading && (
				<div data-testid="metric-details-skeleton">
					<Skeleton active />
				</div>
			)}
			{isMetricDetailsError && !isMetricDetailsLoading && (
				<Empty description="Error fetching metric details" />
			)}
			{!isMetricDetailsLoading && !isMetricDetailsError && (
				<div className="metric-details-content">
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
							<Typography.Text className="metric-details-grid-value">
								<Tooltip title={metric?.samples.toLocaleString()}>
									{formatNumberIntoHumanReadableFormat(metric?.samples)}
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
					<Metadata
						metricName={metric?.name}
						metadata={metric.metadata}
						refetchMetricDetails={refetchMetricDetails}
					/>
					{metric.attributes && (
						<AllAttributes
							metricName={metric?.name}
							attributes={metric.attributes}
							metricType={metric?.metadata?.metric_type}
						/>
					)}
				</div>
			)}
		</Drawer>
	);
}

export default MetricDetails;
