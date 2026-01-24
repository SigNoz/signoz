import { useCallback, useEffect, useMemo } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Empty, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass, Crosshair, X } from 'lucide-react';

import { PANEL_TYPES } from '../../../constants/queryBuilder';
import ROUTES from '../../../constants/routes';
import { useHandleExplorerTabChange } from '../../../hooks/useHandleExplorerTabChange';
import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import { isInspectEnabled } from '../Inspect/utils';
import AllAttributes from './AllAttributes';
import DashboardsAndAlertsPopover from './DashboardsAndAlertsPopover';
import Highlights from './Highlights';
import Metadata from './Metadata';
import { MetricDetailsProps } from './types';
import { getMetricDetailsQuery, transformMetricMetadata } from './utils';
import { useGetMetricMetadata } from 'api/generated/services/metrics';

import './MetricDetails.styles.scss';
import '../Summary/Summary.styles.scss';

function MetricDetails({
	onClose,
	isOpen,
	metricName,
	openInspectModal,
}: MetricDetailsProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const {
		data: metricMetadataResponse,
		isLoading: isLoadingMetricMetadata,
		isError: isErrorMetricMetadata,
	} = useGetMetricMetadata(
		{
			metricName: metricName ?? '',
		},
		{
			query: {
				enabled: !!metricName,
			},
		},
	);

	const metadata = transformMetricMetadata(metricMetadataResponse?.data);

	const showInspectFeature = useMemo(
		() => isInspectEnabled(metadata?.metricType),
		[metadata],
	);

	const goToMetricsExplorerwithSelectedMetric = useCallback(() => {
		if (metricName) {
			const compositeQuery = getMetricDetailsQuery(
				metricName,
				metadata?.metricType,
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
	}, [metricName, handleExplorerTabChange, metadata?.metricType]);

	useEffect(() => {
		logEvent(MetricsExplorerEvents.ModalOpened, {
			[MetricsExplorerEventKeys.Modal]: 'metric-details',
		});
	}, []);

	if (!metricName) {
		return <Empty description="Metric not found" />;
	}

	return (
		<Drawer
			width="60%"
			title={
				<div className="metric-details-header">
					<div className="metric-details-title">
						<Divider type="vertical" />
						<Typography.Text>{metricName}</Typography.Text>
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
						{/* Show the inspect button if the metric type is GAUGE */}
						{showInspectFeature && openInspectModal && (
							<Button
								className="inspect-metrics-button"
								aria-label="Inspect Metric"
								icon={<Crosshair size={18} />}
								onClick={(): void => {
									if (metricName) {
										openInspectModal(metricName);
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
			<div className="metric-details-content">
				<Highlights metricName={metricName} />
				<DashboardsAndAlertsPopover metricName={metricName} />
				<Metadata
					metricName={metricName}
					metadata={metadata}
					isErrorMetricMetadata={isErrorMetricMetadata}
					isLoadingMetricMetadata={isLoadingMetricMetadata}
				/>
				<AllAttributes metricName={metricName} metricType={metadata?.metricType} />
			</div>
		</Drawer>
	);
}

export default MetricDetails;
