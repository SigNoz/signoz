import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { TimeSeries, TimeSeriesData } from 'types/api/v5/queryRange';
import { QueryData } from 'types/api/widgets/getQuery';

import { SerializedTable } from './types';
import { withUnit } from './withUnit';

interface ExportTimeseriesDataArgs {
	data: TimeSeriesData[];
	yAxisUnit?: string;
	legendMap?: Record<string, string>;
	// The builder query that produced the data — lets series names resolve
	// aggregation aliases/expressions exactly like the chart legend does.
	query?: Query;
}

// One row of the flattened V5 tree: a single (query, aggregation, label-set) series.
interface FlatSeries {
	queryName: string;
	labels: Record<string, string>;
	name: string;
	values: { timestamp: number; value: number }[];
}

// V5 labels [{key:{name}, value}] → {name: value} (the getLabelName contract).
function foldLabels(labels: TimeSeries['labels']): Record<string, string> {
	const record: Record<string, string> = {};
	(labels ?? []).forEach((label) => {
		if (label.key?.name) {
			record[label.key.name] = String(label.value);
		}
	});
	return record;
}

// Series display name, matching the chart legend: getLabelName for the base
// (legend template / label-set), then getLegend to resolve the aggregation
// alias/expression from the builder query (the response only carries
// auto-generated `__result_N` aliases). Same chain the uPlot layer uses.
function seriesName(args: {
	labels: Record<string, string>;
	queryName: string;
	legend: string;
	aggIndex: number;
	alias: string;
	query?: Query;
}): string {
	const { labels, queryName, legend, aggIndex, alias, query } = args;
	const baseName = getLabelName(labels, queryName, legend);

	if (!query) {
		return baseName;
	}

	const legacySeries = {
		queryName,
		metric: labels,
		values: [],
		metaData: { alias, index: aggIndex, queryName },
	} as QueryData;

	return getLegend(legacySeries, query, baseName);
}

// Walk results → aggregations → series into a flat, named list.
function flatten(
	data: TimeSeriesData[],
	legendMap?: Record<string, string>,
	query?: Query,
): FlatSeries[] {
	const flat: FlatSeries[] = [];
	data.forEach((result) => {
		const queryName = result.queryName ?? '';
		const legend = legendMap?.[queryName] ?? '';
		(result.aggregations ?? []).forEach((bucket) => {
			(bucket.series ?? []).forEach((series) => {
				const labels = foldLabels(series.labels);
				flat.push({
					queryName,
					labels,
					name: seriesName({
						labels,
						queryName,
						legend,
						aggIndex: bucket.index ?? 0,
						alias: bucket.alias ?? '',
						query,
					}),
					values: (series.values ?? []).map((value) => ({
						timestamp: value.timestamp,
						value: value.value,
					})),
				});
			});
		});
	});
	return flat;
}

function toIso(timestamp: number): string {
	return new Date(timestamp).toISOString();
}

// Tidy (LONG) layout: one row per (series, timestamp). query is its own column.
function buildTable(flat: FlatSeries[], yAxisUnit?: string): SerializedTable {
	const labelKeySet = new Set<string>();
	flat.forEach((series) => {
		Object.keys(series.labels).forEach((key) => labelKeySet.add(key));
	});
	const labelKeys = Array.from(labelKeySet).sort();

	const headers = [
		'timestamp',
		'query',
		'series',
		...labelKeys,
		withUnit('value', yAxisUnit),
	];

	const rows: (string | number)[][] = [];
	flat.forEach((series) => {
		series.values.forEach(({ timestamp, value }) => {
			rows.push([
				toIso(timestamp),
				series.queryName,
				series.name,
				...labelKeys.map((key) => series.labels[key] ?? ''),
				value,
			]);
		});
	});

	return { headers, rows };
}

/**
 * Serializes a V5 time_series result into a format-agnostic tidy table — one
 * row per (series, timestamp), labels as columns, raw values.
 * Pure — walks the V5 tree directly; series names match the chart legend.
 */
export function exportTimeseriesData({
	data,
	yAxisUnit,
	legendMap,
	query,
}: ExportTimeseriesDataArgs): SerializedTable {
	return buildTable(flatten(data, legendMap, query), yAxisUnit);
}
