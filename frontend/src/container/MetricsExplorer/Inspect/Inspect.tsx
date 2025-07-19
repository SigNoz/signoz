import './Inspect.styles.scss';

import * as Sentry from '@sentry/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Drawer, Empty, Skeleton, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { useGetMetricDetails } from 'hooks/metricsExplorer/useGetMetricDetails';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass } from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import ExpandedView from './ExpandedView';
import GraphView from './GraphView';
import QueryBuilder from './QueryBuilder';
import Stepper from './Stepper';
import {
	GraphPopoverOptions,
	InspectProps,
	MetricInspectionAction,
} from './types';
import { useInspectMetrics } from './useInspectMetrics';

function Inspect({
	metricName: defaultMetricName,
	isOpen,
	onClose,
}: InspectProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [metricName, setMetricName] = useState<string | null>(defaultMetricName);
	const [
		popoverOptions,
		setPopoverOptions,
	] = useState<GraphPopoverOptions | null>(null);
	const [
		expandedViewOptions,
		setExpandedViewOptions,
	] = useState<GraphPopoverOptions | null>(null);
	const [showExpandedView, setShowExpandedView] = useState(false);

	const { data: metricDetailsData } = useGetMetricDetails(metricName ?? '', {
		enabled: !!metricName,
	});

	const { currentQuery } = useQueryBuilder();
	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
					},
				],
			},
		}),
		[currentQuery],
	);

	const searchQuery = updatedCurrentQuery?.builder?.queryData[0] || null;

	useEffect(() => {
		handleChangeQueryData('filters', {
			op: 'AND',
			items: [],
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
		spaceAggregatedSeriesMap: spaceAggregationSeriesMap,
		aggregatedTimeSeries,
		timeAggregatedSeriesMap,
		reset,
	} = useInspectMetrics(metricName);

	const handleDispatchMetricInspectionOptions = useCallback(
		(action: MetricInspectionAction): void => {
			dispatchMetricInspectionOptions(action);
			logEvent(MetricsExplorerEvents.InspectQueryChanged, {
				[MetricsExplorerEventKeys.Modal]: 'inspect',
				[MetricsExplorerEventKeys.Filters]: metricInspectionOptions.filters,
				[MetricsExplorerEventKeys.TimeAggregationInterval]:
					metricInspectionOptions.timeAggregationInterval,
				[MetricsExplorerEventKeys.TimeAggregationOption]:
					metricInspectionOptions.timeAggregationOption,
				[MetricsExplorerEventKeys.SpaceAggregationOption]:
					metricInspectionOptions.spaceAggregationOption,
				[MetricsExplorerEventKeys.SpaceAggregationLabels]:
					metricInspectionOptions.spaceAggregationLabels,
			});
		},
		[dispatchMetricInspectionOptions, metricInspectionOptions],
	);

	const selectedMetricType = useMemo(
		() => metricDetailsData?.payload?.data?.metadata?.metric_type,
		[metricDetailsData],
	);

	const selectedMetricUnit = useMemo(
		() => metricDetailsData?.payload?.data?.metadata?.unit,
		[metricDetailsData],
	);

	const resetInspection = useCallback(() => {
		setShowExpandedView(false);
		setPopoverOptions(null);
		setExpandedViewOptions(null);
		reset();
	}, [reset]);

	// Reset inspection when the selected metric changes
	useEffect(() => {
		resetInspection();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [metricName]);

	// Hide expanded view whenever inspection step changes
	useEffect(() => {
		setShowExpandedView(false);
		setExpandedViewOptions(null);
	}, [inspectionStep]);

	const content = useMemo(() => {
		if (isInspectMetricsLoading && !isInspectMetricsRefetching) {
			return (
				<div
					data-testid="inspect-metrics-loading"
					className="inspect-metrics-fallback"
				>
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
				<div
					data-testid="inspect-metrics-error"
					className="inspect-metrics-fallback"
				>
					<Empty description={errorMessage} />
				</div>
			);
		}

		if (!inspectMetricsTimeSeries.length) {
			return (
				<div
					data-testid="inspect-metrics-empty"
					className="inspect-metrics-fallback"
				>
					<Empty description="No time series found for this metric to inspect." />
				</div>
			);
		}

		return (
			<div className="inspect-metrics-content">
				<div className="inspect-metrics-content-first-col">
					<GraphView
						inspectMetricsTimeSeries={aggregatedTimeSeries}
						formattedInspectMetricsTimeSeries={formattedInspectMetricsTimeSeries}
						resetInspection={resetInspection}
						metricName={metricName}
						metricUnit={selectedMetricUnit}
						metricType={selectedMetricType}
						spaceAggregationSeriesMap={spaceAggregationSeriesMap}
						inspectionStep={inspectionStep}
						setPopoverOptions={setPopoverOptions}
						setShowExpandedView={setShowExpandedView}
						showExpandedView={showExpandedView}
						setExpandedViewOptions={setExpandedViewOptions}
						popoverOptions={popoverOptions}
						metricInspectionOptions={metricInspectionOptions}
						isInspectMetricsRefetching={isInspectMetricsRefetching}
					/>
					<QueryBuilder
						metricName={metricName}
						metricType={selectedMetricType}
						setMetricName={setMetricName}
						spaceAggregationLabels={spaceAggregationLabels}
						metricInspectionOptions={metricInspectionOptions}
						dispatchMetricInspectionOptions={handleDispatchMetricInspectionOptions}
						inspectionStep={inspectionStep}
						inspectMetricsTimeSeries={inspectMetricsTimeSeries}
						searchQuery={searchQuery as IBuilderQuery}
					/>
				</div>
				<div className="inspect-metrics-content-second-col">
					<Stepper
						inspectionStep={inspectionStep}
						resetInspection={resetInspection}
					/>
					{showExpandedView && (
						<ExpandedView
							options={expandedViewOptions}
							spaceAggregationSeriesMap={spaceAggregationSeriesMap}
							step={inspectionStep}
							metricInspectionOptions={metricInspectionOptions}
							timeAggregatedSeriesMap={timeAggregatedSeriesMap}
						/>
					)}
				</div>
			</div>
		);
	}, [
		isInspectMetricsLoading,
		isInspectMetricsRefetching,
		isInspectMetricsError,
		inspectMetricsStatusCode,
		inspectMetricsTimeSeries,
		aggregatedTimeSeries,
		formattedInspectMetricsTimeSeries,
		resetInspection,
		metricName,
		selectedMetricUnit,
		selectedMetricType,
		spaceAggregationSeriesMap,
		inspectionStep,
		showExpandedView,
		popoverOptions,
		metricInspectionOptions,
		spaceAggregationLabels,
		handleDispatchMetricInspectionOptions,
		searchQuery,
		expandedViewOptions,
		timeAggregatedSeriesMap,
	]);

	useEffect(() => {
		logEvent(MetricsExplorerEvents.ModalOpened, {
			[MetricsExplorerEventKeys.Modal]: 'inspect',
		});
	}, []);

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
