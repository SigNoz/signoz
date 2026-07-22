import {
	getTimeRangeFromStepInterval,
	isApmMetric,
} from 'container/PanelWrapper/utils';
import type { BuilderQuery, MetricAggregation } from 'types/api/v5/queryRange';

/** Fallback step (seconds) when the response carries no per-query step interval (V1 parity). */
const DEFAULT_STEP_INTERVAL = 60;

interface StepClickTimeRangeArgs {
	/** Clicked bucket timestamp, in the chart's x-unit (epoch seconds). */
	clickedDataTimestamp: number;
	/** The clicked series' query — used to detect APM metrics. */
	queryName: string;
	builderQueries: BuilderQuery[];
	/** Clicked series' step (seconds); falls back to DEFAULT_STEP_INTERVAL. */
	stepInterval?: number;
}

/**
 * Time window for a time-axis chart click: the clicked bucket plus one step (V1 parity). APM-metric
 * panels widen the window one step to the left. Shared by the TimeSeries and Bar renderers; the
 * matching field remapping happens later inside `getViewQuery`.
 */
export function stepClickTimeRange({
	clickedDataTimestamp,
	queryName,
	builderQueries,
	stepInterval = DEFAULT_STEP_INTERVAL,
}: StepClickTimeRangeArgs): { startTime: number; endTime: number } {
	const builderQuery = builderQueries.find((query) => query.name === queryName);
	const isApm =
		builderQuery?.signal === 'metrics' &&
		isApmMetric(
			(builderQuery?.aggregations?.[0] as MetricAggregation)?.metricName ?? '',
		);
	return getTimeRangeFromStepInterval(stepInterval, clickedDataTimestamp, isApm);
}
