import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import * as Sentry from '@sentry/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Drawer, Empty, Skeleton, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { useGetMetricMetadata } from 'api/generated/services/metrics';
import QueryCancelledPlaceholder from 'components/QueryCancelledPlaceholder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass } from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
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

import './Inspect.styles.scss';

function Inspect({
	metricName: defaultMetricName,
	isOpen,
	onClose,
}: InspectProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [currentMetricName, setCurrentMetricName] =
		useState<string>(defaultMetricName);
	const [appliedMetricName, setAppliedMetricName] =
		useState<string>(defaultMetricName);
	const [popoverOptions, setPopoverOptions] =
		useState<GraphPopoverOptions | null>(null);
	const [expandedViewOptions, setExpandedViewOptions] =
		useState<GraphPopoverOptions | null>(null);
	const [showExpandedView, setShowExpandedView] = useState(false);

	const { data: metricDetailsData } = useGetMetricMetadata(
		{ metricName: appliedMetricName ?? '' },
		{
			query: {
				enabled: !!appliedMetricName,
			},
		},
	);

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
	} = useInspectMetrics(appliedMetricName);

	const [isCancelled, setIsCancelled] = useState(false);

	// Auto-reset isCancelled only on the rising edge of a new fetch
	// (transition from not-loading → loading). Watching `isLoading` directly
	// races with the cancel flow — when the user cancels mid-fetch, loading
	// is still true in the render right after setIsCancelled(true), which
	// would immediately reset it.
	const wasLoadingRef = useRef(false);
	useEffect(() => {
		const nowLoading = isInspectMetricsLoading || isInspectMetricsRefetching;
		if (!wasLoadingRef.current && nowLoading) {
			setIsCancelled(false);
		}
		wasLoadingRef.current = nowLoading;
	}, [isInspectMetricsLoading, isInspectMetricsRefetching]);

	const queryClient = useQueryClient();
	const handleCancelInspectQuery = useCallback(() => {
		queryClient.cancelQueries(REACT_QUERY_KEY.GET_INSPECT_METRICS_DETAILS);
		setIsCancelled(true);
	}, [queryClient]);

	const handleDispatchMetricInspectionOptions = useCallback(
		(action: MetricInspectionAction): void => {
			dispatchMetricInspectionOptions(action);
			logEvent(MetricsExplorerEvents.InspectQueryChanged, {
				[MetricsExplorerEventKeys.Modal]: 'inspect',
			});
		},
		[dispatchMetricInspectionOptions],
	);

	const selectedMetricType = useMemo(
		() => metricDetailsData?.data?.type,
		[metricDetailsData],
	);

	const selectedMetricUnit = useMemo(
		() => metricDetailsData?.data?.unit,
		[metricDetailsData],
	);

	const aggregateAttribute = useMemo(
		() => ({
			key: currentMetricName ?? '',
			dataType: DataTypes.String,
			type: selectedMetricType as string,
			isColumn: true,
			isJSON: false,
			id: `${currentMetricName}--${DataTypes.String}--${selectedMetricType}--true`,
		}),
		[currentMetricName, selectedMetricType],
	);

	const [currentQueryData, setCurrentQueryData] = useState<IBuilderQuery>({
		...searchQuery,
		aggregateAttribute,
	});

	useEffect(() => {
		if (searchQuery) {
			setCurrentQueryData({
				...searchQuery,
				aggregateAttribute,
			});
		}
	}, [aggregateAttribute, searchQuery]);

	const resetInspection = useCallback(() => {
		setShowExpandedView(false);
		setPopoverOptions(null);
		setExpandedViewOptions(null);
		setCurrentQueryData(searchQuery as IBuilderQuery);
		reset();
	}, [reset, searchQuery]);

	// Hide expanded view whenever inspection step changes
	useEffect(() => {
		setShowExpandedView(false);
		setExpandedViewOptions(null);
	}, [inspectionStep]);

	const chartArea = useMemo(() => {
		const renderFallback = (testId: string, body: JSX.Element): JSX.Element => (
			<div data-testid={testId} className="inspect-metrics-fallback">
				<div className="inspect-metrics-fallback-header-placeholder" />
				<div className="inspect-metrics-fallback-body">{body}</div>
			</div>
		);

		// Cancelled state takes precedence over any react-query state — ensures
		// the placeholder shows immediately on cancel, regardless of whether
		// isLoading/isRefetching has settled yet.
		if (isCancelled) {
			return renderFallback(
				'inspect-metrics-cancelled',
				<QueryCancelledPlaceholder subText='Click "Run Query" to see inspect results.' />,
			);
		}

		if (isInspectMetricsLoading && !isInspectMetricsRefetching) {
			return renderFallback('inspect-metrics-loading', <Skeleton active />);
		}

		if (isInspectMetricsError) {
			return renderFallback(
				'inspect-metrics-error',
				<Empty description="Error loading inspect metrics." />,
			);
		}

		if (inspectMetricsTimeSeries.length === 0) {
			return renderFallback(
				'inspect-metrics-empty',
				<Empty description="No time series found for this metric to inspect." />,
			);
		}

		return (
			<GraphView
				inspectMetricsTimeSeries={aggregatedTimeSeries}
				formattedInspectMetricsTimeSeries={formattedInspectMetricsTimeSeries}
				resetInspection={resetInspection}
				metricName={appliedMetricName}
				metricUnit={selectedMetricUnit}
				metricType={selectedMetricType}
				spaceAggregationSeriesMap={spaceAggregationSeriesMap}
				inspectionStep={inspectionStep}
				setPopoverOptions={setPopoverOptions}
				setShowExpandedView={setShowExpandedView}
				showExpandedView={showExpandedView}
				setExpandedViewOptions={setExpandedViewOptions}
				popoverOptions={popoverOptions}
				metricInspectionAppliedOptions={metricInspectionOptions.appliedOptions}
				isInspectMetricsRefetching={isInspectMetricsRefetching}
			/>
		);
	}, [
		isInspectMetricsLoading,
		isInspectMetricsRefetching,
		isInspectMetricsError,
		isCancelled,
		inspectMetricsTimeSeries,
		aggregatedTimeSeries,
		formattedInspectMetricsTimeSeries,
		resetInspection,
		appliedMetricName,
		selectedMetricUnit,
		selectedMetricType,
		spaceAggregationSeriesMap,
		inspectionStep,
		showExpandedView,
		popoverOptions,
		metricInspectionOptions.appliedOptions,
		metricInspectionOptions.currentOptions,
		currentMetricName,
		setCurrentMetricName,
		setAppliedMetricName,
		spaceAggregationLabels,
		handleDispatchMetricInspectionOptions,
		currentQueryData,
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
				<div className="inspect-metrics-content">
					<div className="inspect-metrics-content-first-col">
						{chartArea}
						<QueryBuilder
							currentMetricName={currentMetricName}
							setCurrentMetricName={setCurrentMetricName}
							setAppliedMetricName={setAppliedMetricName}
							spaceAggregationLabels={spaceAggregationLabels}
							currentMetricInspectionOptions={metricInspectionOptions.currentOptions}
							dispatchMetricInspectionOptions={handleDispatchMetricInspectionOptions}
							inspectionStep={inspectionStep}
							inspectMetricsTimeSeries={inspectMetricsTimeSeries}
							currentQuery={currentQueryData}
							setCurrentQuery={setCurrentQueryData}
							isLoadingQueries={isInspectMetricsLoading || isInspectMetricsRefetching}
							handleCancelQuery={handleCancelInspectQuery}
							onRunQuery={(): void => {
								setIsCancelled(false);
								queryClient.invalidateQueries([
									REACT_QUERY_KEY.GET_INSPECT_METRICS_DETAILS,
								]);
							}}
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
								metricInspectionAppliedOptions={metricInspectionOptions.appliedOptions}
								timeAggregatedSeriesMap={timeAggregatedSeriesMap}
							/>
						)}
					</div>
				</div>
			</Drawer>
		</Sentry.ErrorBoundary>
	);
}

export default Inspect;
