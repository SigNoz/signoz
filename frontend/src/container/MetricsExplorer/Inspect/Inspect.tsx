import './Inspect.styles.scss';

import * as Sentry from '@sentry/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Drawer, Empty, Skeleton, Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass } from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useMemo } from 'react';

import { InspectProps } from './types';
import { useInspectMetrics } from './useInspectMetrics';

function Inspect({ metricName, isOpen, onClose }: InspectProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const {
		inspectMetricsTimeSeries,
		inspectMetricsStatusCode,
		isInspectMetricsLoading,
		isInspectMetricsError,
	} = useInspectMetrics(metricName);

	const content = useMemo(() => {
		if (isInspectMetricsLoading) {
			return (
				<div className="inspect-metrics-fallback">
					<Skeleton active />
				</div>
			);
		}

		if (isInspectMetricsError || inspectMetricsStatusCode !== 200) {
			const errorMessage =
				inspectMetricsStatusCode === 400
					? 'The time range is too large. Please modify it to be within 30 minutes.'
					: 'Error loading inspect metrics.';

			return (
				<div className="inspect-metrics-fallback">
					<Empty description={errorMessage} />
				</div>
			);
		}

		if (!inspectMetricsTimeSeries.length) {
			return (
				<div className="inspect-metrics-fallback">
					<Empty description="No time series found for this metric to inspect." />
				</div>
			);
		}

		return <div>Inspect</div>;
	}, [
		isInspectMetricsLoading,
		isInspectMetricsError,
		inspectMetricsTimeSeries.length,
		inspectMetricsStatusCode,
	]);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Drawer
				width="100%"
				title={
					<div className="inspect-metrics-title">
						<Typography.Text>Metrics Explorer —</Typography.Text>
						<Button
							className="inspect-metrics-button"
							size="small"
							icon={<Compass size={14} />}
							disabled
						>
							Inspect Metric
						</Button>
					</div>
				}
				open={isOpen}
				onClose={onClose}
				style={{
					overscrollBehavior: 'contain',
					background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
				}}
				className="inspect-metrics-modal"
				destroyOnClose
			>
				{content}
			</Drawer>
		</Sentry.ErrorBoundary>
	);
}

export default Inspect;
