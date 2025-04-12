import './Inspect.styles.scss';

import * as Sentry from '@sentry/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Drawer, Empty, Skeleton, Typography } from 'antd';
import { useGetMetricDetails } from 'hooks/metricsExplorer/useGetMetricDetails';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass } from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useEffect, useMemo, useState } from 'react';

import GraphView from './GraphView';
import QueryBuilder from './QueryBuilder';
import Stepper from './Stepper';
import { InspectProps } from './types';
import { useInspectMetrics } from './useInspectMetrics';

function Inspect({
	metricName: defaultMetricName,
	isOpen,
	onClose,
}: InspectProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [metricName, setMetricName] = useState<string | null>(defaultMetricName);

	const { data: metricDetailsData } = useGetMetricDetails(metricName ?? '', {
		enabled: !!metricName,
	});

	const {
		inspectMetricsTimeSeries,
		inspectMetricsStatusCode,
		isInspectMetricsLoading,
		isInspectMetricsError,
		formattedInspectMetricsTimeSeries,
		spaceAggregationLabels,
		metricInspectionOptions,
		dispatchMetricInspectionOptions,
		inspectionStep,
		isInspectMetricsRefetching,
	} = useInspectMetrics(metricName);

	const selectedMetricType = useMemo(
		() => metricDetailsData?.payload?.data?.metadata?.metric_type,
		[metricDetailsData],
	);

	const selectedMetricUnit = useMemo(
		() => metricDetailsData?.payload?.data?.metadata?.unit,
		[metricDetailsData],
	);

	const resetInspection = useCallback(() => {
		dispatchMetricInspectionOptions({
			type: 'RESET_INSPECTION',
		});
	}, [dispatchMetricInspectionOptions]);

	// Reset inspection when the selected metric changes
	useEffect(() => {
		resetInspection();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [metricName]);

	const content = useMemo(() => {
		if (isInspectMetricsLoading && !isInspectMetricsRefetching) {
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

		return (
			<div className="inspect-metrics-content">
				<div className="inspect-metrics-content-first-col">
					<GraphView
						inspectMetricsTimeSeries={inspectMetricsTimeSeries}
						formattedInspectMetricsTimeSeries={formattedInspectMetricsTimeSeries}
						resetInspection={resetInspection}
						metricName={metricName}
						metricUnit={selectedMetricUnit}
						metricType={selectedMetricType}
					/>
					<QueryBuilder
						metricName={metricName}
						metricType={selectedMetricType}
						setMetricName={setMetricName}
						spaceAggregationLabels={spaceAggregationLabels}
						metricInspectionOptions={metricInspectionOptions}
						dispatchMetricInspectionOptions={dispatchMetricInspectionOptions}
						inspectionStep={inspectionStep}
					/>
				</div>
				<div className="inspect-metrics-content-second-col">
					<Stepper
						inspectionStep={inspectionStep}
						resetInspection={resetInspection}
					/>
				</div>
			</div>
		);
	}, [
		isInspectMetricsLoading,
		isInspectMetricsRefetching,
		isInspectMetricsError,
		inspectMetricsStatusCode,
		inspectMetricsTimeSeries,
		formattedInspectMetricsTimeSeries,
		resetInspection,
		metricName,
		selectedMetricUnit,
		selectedMetricType,
		spaceAggregationLabels,
		metricInspectionOptions,
		dispatchMetricInspectionOptions,
		inspectionStep,
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
