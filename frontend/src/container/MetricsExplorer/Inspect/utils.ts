/* eslint-disable no-nested-ternary */
import { MetrictypesTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import {
	GraphPopoverData,
	GraphPopoverOptions,
	MetricInspectionOptions,
	SpaceAggregationOptions,
	TimeAggregationOptions,
} from './types';

/**
 * Check if the inspect feature flag is enabled
 * returns true if the feature flag is enabled, false otherwise
 * Show the inspect button in  metrics explorer if the feature flag is enabled
 */
export function isInspectEnabled(
	metricType: MetrictypesTypeDTO | undefined,
): boolean {
	return metricType === MetrictypesTypeDTO.gauge;
}

export function getAllTimestampsOfMetrics(
	inspectMetricsTimeSeries: InspectMetricsSeries[],
): number[] {
	return Array.from(
		new Set(
			inspectMetricsTimeSeries
				.flatMap((series) => series.values.map((value) => value.timestamp))
				.sort((a, b) => a - b),
		),
	);
}

export function getDefaultTimeAggregationInterval(
	timeSeries: InspectMetricsSeries | undefined,
): number {
	if (!timeSeries) {
		return 60;
	}
	const reportingInterval =
		timeSeries.values.length > 1
			? Math.abs(timeSeries.values[1].timestamp - timeSeries.values[0].timestamp) /
			  1000
			: 0;
	return Math.max(60, reportingInterval);
}

export function applyFilters(
	inspectMetricsTimeSeries: InspectMetricsSeries[],
	filters: TagFilter,
): InspectMetricsSeries[] {
	return inspectMetricsTimeSeries.filter((series) =>
		filters.items.every((filter) => {
			if ((filter.key?.key || '') in series.labels) {
				const value = series.labels[filter.key?.key ?? ''];
				switch (filter.op) {
					case '=':
						return value === filter.value;
					case '!=':
						return value !== filter.value;
					case 'in':
						return (filter.value as string[]).includes(value as string);
					case 'nin':
						return !(filter.value as string[]).includes(value as string);
					case 'like':
						return value.includes(filter.value as string);
					case 'nlike':
						return !value.includes(filter.value as string);
					case 'contains':
						return value.includes(filter.value as string);
					case 'ncontains':
						return !value.includes(filter.value as string);
					default:
						return true;
				}
			}
			return false;
		}),
	);
}

export function applyTimeAggregation(
	inspectMetricsTimeSeries: InspectMetricsSeries[],
	metricInspectionAppliedOptions: MetricInspectionOptions,
): {
	timeAggregatedSeries: InspectMetricsSeries[];
	timeAggregatedSeriesMap: Map<number, GraphPopoverData[]>;
} {
	const {
		timeAggregationOption,
		timeAggregationInterval,
	} = metricInspectionAppliedOptions;

	if (!timeAggregationInterval) {
		return {
			timeAggregatedSeries: inspectMetricsTimeSeries,
			timeAggregatedSeriesMap: new Map(),
		};
	}

	// Group timestamps into intervals and aggregate values for each series independently
	const timeAggregatedSeriesMap: Map<number, GraphPopoverData[]> = new Map();

	const timeAggregatedSeries: InspectMetricsSeries[] = inspectMetricsTimeSeries.map(
		(series) => {
			const groupedTimestamps = new Map<number, number[]>();

			series.values.forEach(({ timestamp, value }) => {
				const intervalBucket =
					Math.floor(timestamp / (timeAggregationInterval * 1000)) *
					(timeAggregationInterval * 1000);

				if (!groupedTimestamps.has(intervalBucket)) {
					groupedTimestamps.set(intervalBucket, []);
				}
				if (!timeAggregatedSeriesMap.has(intervalBucket)) {
					timeAggregatedSeriesMap.set(intervalBucket, []);
				}

				groupedTimestamps.get(intervalBucket)?.push(parseFloat(value));
				timeAggregatedSeriesMap.get(intervalBucket)?.push({
					timestamp,
					value,
					type: 'instance',
					title: series.title,
					timeSeries: series,
				});
			});

			const aggregatedValues = Array.from(groupedTimestamps.entries()).map(
				([intervalStart, values]) => {
					let aggregatedValue: number;

					switch (timeAggregationOption) {
						case TimeAggregationOptions.LATEST:
							aggregatedValue = values[values.length - 1];
							break;
						case TimeAggregationOptions.SUM:
							aggregatedValue = values.reduce((sum, val) => sum + val, 0);
							break;
						case TimeAggregationOptions.AVG:
							aggregatedValue =
								values.reduce((sum, val) => sum + val, 0) / values.length;
							break;
						case TimeAggregationOptions.MIN:
							aggregatedValue = Math.min(...values);
							break;
						case TimeAggregationOptions.MAX:
							aggregatedValue = Math.max(...values);
							break;
						case TimeAggregationOptions.COUNT:
							aggregatedValue = values.length;
							break;
						default:
							aggregatedValue = values[values.length - 1];
					}

					return {
						timestamp: intervalStart,
						value: aggregatedValue.toString(),
					};
				},
			);

			return {
				...series,
				values: aggregatedValues,
			};
		},
	);

	return { timeAggregatedSeries, timeAggregatedSeriesMap };
}

export function applySpaceAggregation(
	inspectMetricsTimeSeries: InspectMetricsSeries[],
	metricInspectionAppliedOptions: MetricInspectionOptions,
): {
	aggregatedSeries: InspectMetricsSeries[];
	spaceAggregatedSeriesMap: Map<string, InspectMetricsSeries[]>;
} {
	// Group series by selected space aggregation labels
	const groupedSeries = new Map<string, InspectMetricsSeries[]>();

	inspectMetricsTimeSeries.forEach((series) => {
		// Create composite key from selected labels
		const key = metricInspectionAppliedOptions.spaceAggregationLabels
			.map((label) => `${label}:${series.labels[label]}`)
			.join(',');

		if (!groupedSeries.has(key)) {
			groupedSeries.set(key, []);
		}
		groupedSeries.get(key)?.push(series);
	});

	// Aggregate each group based on space aggregation option
	const aggregatedSeries: InspectMetricsSeries[] = [];

	groupedSeries.forEach((seriesGroup, key) => {
		// Get the first series to use as template for labels and timestamps
		const templateSeries = seriesGroup[0];

		// Create a map of timestamp to array of values across all series in group
		const timestampValuesMap = new Map<number, number[]>();

		// Collect values for each timestamp across all series
		seriesGroup.forEach((series) => {
			series.values.forEach(({ timestamp, value }) => {
				if (!timestampValuesMap.has(timestamp)) {
					timestampValuesMap.set(timestamp, []);
				}
				timestampValuesMap.get(timestamp)?.push(parseFloat(value));
			});
		});

		// Aggregate values based on selected space aggregation option
		const aggregatedValues = Array.from(timestampValuesMap.entries()).map(
			([timestamp, values]) => {
				let aggregatedValue: number;

				switch (metricInspectionAppliedOptions.spaceAggregationOption) {
					case SpaceAggregationOptions.SUM_BY:
						aggregatedValue = values.reduce((sum, val) => sum + val, 0);
						break;
					case SpaceAggregationOptions.AVG_BY:
						aggregatedValue =
							values.reduce((sum, val) => sum + val, 0) / values.length;
						break;
					case SpaceAggregationOptions.MIN_BY:
						aggregatedValue = Math.min(...values);
						break;
					case SpaceAggregationOptions.MAX_BY:
						aggregatedValue = Math.max(...values);
						break;
					default:
						// eslint-disable-next-line prefer-destructuring
						aggregatedValue = values[0];
				}

				return {
					timestamp,
					value: (aggregatedValue || 0).toString(),
				};
			},
		);

		// Create aggregated series with original labels
		aggregatedSeries.push({
			...templateSeries,
			values: aggregatedValues.sort((a, b) => a.timestamp - b.timestamp),
			title: key.split(',').join(' '),
		});
	});

	return {
		aggregatedSeries,
		spaceAggregatedSeriesMap: groupedSeries,
	};
}

export function getSeriesIndexFromPixel(
	e: MouseEvent,
	u: uPlot,
	formattedInspectMetricsTimeSeries: uPlot.AlignedData,
): number {
	const bbox = u.over.getBoundingClientRect(); // plot area only
	const left = e.clientX - bbox.left;
	const top = e.clientY - bbox.top;

	const timestampIndex = u.posToIdx(left);
	let seriesIndex = -1;
	let closestPixelDiff = Infinity;

	for (let i = 1; i < formattedInspectMetricsTimeSeries.length; i++) {
		const series = formattedInspectMetricsTimeSeries[i];
		const seriesValue = series[timestampIndex];

		if (
			seriesValue !== undefined &&
			seriesValue !== null &&
			!Number.isNaN(seriesValue)
		) {
			const seriesYPx = u.valToPos(seriesValue, 'y');
			const pixelDiff = Math.abs(seriesYPx - top);

			if (pixelDiff < closestPixelDiff) {
				closestPixelDiff = pixelDiff;
				seriesIndex = i;
			}
		}
	}

	return seriesIndex;
}

export function onGraphClick(
	e: MouseEvent,
	u: uPlot,
	popoverRef: React.RefObject<HTMLDivElement>,
	setPopoverOptions: (options: GraphPopoverOptions | null) => void,
	inspectMetricsTimeSeries: InspectMetricsSeries[],
	showPopover: boolean,
	setShowPopover: (showPopover: boolean) => void,
	formattedInspectMetricsTimeSeries: uPlot.AlignedData,
): void {
	if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
		// Clicked inside the popover, don't close
		return;
	}
	// If popover is already open, close it
	if (showPopover) {
		setShowPopover(false);
		return;
	}
	// Get which series the user clicked on
	// If no series is clicked, return
	const seriesIndex = getSeriesIndexFromPixel(
		e,
		u,
		formattedInspectMetricsTimeSeries,
	);
	if (seriesIndex <= 0) {
		return;
	}

	const series = inspectMetricsTimeSeries[seriesIndex - 1];

	const { left } = u.over.getBoundingClientRect();
	const x = e.clientX - left;
	const xVal = u.posToVal(x, 'x'); // Get actual x-axis value

	const closestPoint = series?.values.reduce((prev, curr) => {
		const prevDiff = Math.abs(prev.timestamp - xVal);
		const currDiff = Math.abs(curr.timestamp - xVal);
		return prevDiff < currDiff ? prev : curr;
	});

	setPopoverOptions({
		x: e.clientX,
		y: e.clientY,
		value: parseFloat(closestPoint?.value ?? '0'),
		timestamp: closestPoint?.timestamp,
		timeSeries: series,
	});
	setShowPopover(true);
}

export function getRawDataFromTimeSeries(
	timeSeries: InspectMetricsSeries,
	timestamp: number,
	showAll = false,
): GraphPopoverData[] {
	if (showAll) {
		return timeSeries.values.map((value) => ({
			timestamp: value.timestamp,
			type: 'instance',
			value: value.value,
			title: timeSeries.title,
		}));
	}

	const timestampIndex = timeSeries.values.findIndex(
		(value) => value.timestamp >= timestamp,
	);
	const timestamps = [];
	if (timestampIndex !== undefined) {
		for (
			let i = Math.max(0, timestampIndex - 2);
			i <= Math.min((timeSeries?.values?.length ?? 0) - 1, timestampIndex + 2);
			i++
		) {
			timestamps.push(timeSeries?.values?.[i]);
		}
	}
	return timestamps.map((timestamp) => ({
		timestamp: timestamp.timestamp,
		type: 'instance',
		value: timestamp.value,
		title: timeSeries.title,
	}));
}

export function getSpaceAggregatedDataFromTimeSeries(
	timeSeries: InspectMetricsSeries,
	spaceAggregatedSeriesMap: Map<string, InspectMetricsSeries[]>,
	timestamp: number,
	showAll = false,
): GraphPopoverData[] {
	if (spaceAggregatedSeriesMap.size === 0) {
		return [];
	}

	const appliedLabels =
		Array.from(spaceAggregatedSeriesMap.keys())[0]
			?.split(',')
			.map((label) => label.split(':')[0]) || [];

	let matchingSeries: InspectMetricsSeries[] = [];
	spaceAggregatedSeriesMap.forEach((series) => {
		let isMatching = true;
		appliedLabels.forEach((label) => {
			if (timeSeries.labels[label] !== series[0].labels[label]) {
				isMatching = false;
			}
		});
		if (isMatching) {
			matchingSeries = series;
		}
	});

	return matchingSeries
		.slice(0, showAll ? matchingSeries.length : 5)
		.map((series) => {
			const timestampIndex = series.values.findIndex(
				(value) => value.timestamp >= timestamp,
			);
			const value = series.values[timestampIndex]?.value;
			return {
				timeseries: Object.entries(series.labels)
					.map(([key, value]) => `${key}:${value}`)
					.join(','),
				type: 'aggregated',
				value: value ?? '-',
				title: series.title,
				timeSeries: series,
			};
		});
}

export const formatTimestampToFullDateTime = (
	timestamp: string | number,
	returnOnlyTime = false,
): string => {
	const date = new Date(Number(timestamp));

	const datePart = date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});

	const timePart = date.toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

	if (returnOnlyTime) {
		return timePart;
	}

	return `${datePart} ⎯ ${timePart}`;
};

export function onGraphHover(
	e: MouseEvent,
	u: uPlot,
	setPopoverOptions: (options: GraphPopoverOptions | null) => void,
	inspectMetricsTimeSeries: InspectMetricsSeries[],
	formattedInspectMetricsTimeSeries: uPlot.AlignedData,
): void {
	const { left, top } = u.over.getBoundingClientRect();
	const x = e.clientX - left;
	const y = e.clientY - top;
	const xVal = u.posToVal(x, 'x'); // Get actual x-axis value
	const yVal = u.posToVal(y, 'y'); // Get actual y-axis value value (metric value)

	// Get which series the user clicked on
	const seriesIndex = getSeriesIndexFromPixel(
		e,
		u,
		formattedInspectMetricsTimeSeries,
	);
	if (seriesIndex === -1) {
		setPopoverOptions({
			x: e.clientX,
			y: e.clientY,
			value: yVal,
			timestamp: xVal,
			timeSeries: undefined,
		});
		return;
	}

	const series = inspectMetricsTimeSeries[seriesIndex - 1];

	setPopoverOptions({
		x: e.clientX,
		y: e.clientY,
		value: yVal,
		timestamp: xVal,
		timeSeries: series,
	});
}
