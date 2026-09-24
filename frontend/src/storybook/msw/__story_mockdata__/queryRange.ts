/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { Warning } from 'types/api';
import type { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';
import type {
	ColumnDescriptor,
	MetricRangePayloadV5,
	RequestType,
	TimeSeries,
	TimeSeriesValue,
} from 'types/api/v5/queryRange';
import type { Column, SeriesItem } from 'types/api/widgets/getQuery';

/** Typed builders for the query_range response shapes, v5 first then v3. */

/** What every builder takes on top of its data: the warning the toolbar reads. */
interface ResponseOptions {
	queryName?: string;
	warning?: Warning;
}

export const queryRangeV5ScalarResponse = (
	value: number,
	queryName = 'A',
	{ warning }: Pick<ResponseOptions, 'warning'> = {},
): MetricRangePayloadV5 => ({
	data: {
		warning,
		type: 'scalar',
		data: {
			results: [
				{
					columns: [
						{
							name: '__result_0',
							queryName,
							aggregationIndex: 0,
							columnType: 'aggregation',
						},
					],
					data: [[value]],
				},
			],
		},
		meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0, stepIntervals: {} },
	},
});

/**
 * An aggregation column: the query it answers for, and which of that query's
 * aggregations it is when the query asked for several.
 */
export interface ScalarAggregationColumn {
	queryName: string;
	aggregationIndex?: number;
}

export interface ScalarTableSpec {
	/** Group-by columns, in the order the rows carry their values. */
	groupBy?: string[];
	/** Query names the aggregation columns answer for, after the group columns. */
	aggregations: Array<string | ScalarAggregationColumn>;
	rows: unknown[][];
}

/**
 * A table panel's answer: group columns first, then one column per query. The
 * legacy conversion keys each cell by the group column's name or the query's
 * name, which is what the table formatters read (`row.data.http_url`,
 * `row.data.A`).
 */
export const queryRangeV5ScalarTableResponse = ({
	groupBy = [],
	aggregations,
	rows,
}: ScalarTableSpec): MetricRangePayloadV5 => {
	const columns: ColumnDescriptor[] = [
		...groupBy.map((name) => ({
			name,
			queryName: '',
			aggregationIndex: 0,
			columnType: 'group' as const,
		})),
		...aggregations.map((aggregation) => {
			const { queryName, aggregationIndex = 0 } =
				typeof aggregation === 'string' ? { queryName: aggregation } : aggregation;

			return {
				name: `__result_${aggregationIndex}`,
				queryName,
				aggregationIndex,
				columnType: 'aggregation' as const,
			};
		}),
	];

	return {
		data: {
			type: 'scalar',
			data: { results: [{ columns, data: rows }] },
			meta: {
				rowsScanned: rows.length,
				bytesScanned: 0,
				durationMs: 0,
				stepIntervals: {},
			},
		},
	};
};

export const queryRangeV5EmptyResponse = (
	queryName = 'A',
): MetricRangePayloadV5 => ({
	data: {
		type: 'raw',
		data: {
			results: [{ queryName, nextCursor: '', rows: [] }],
		},
		meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0, stepIntervals: {} },
	},
});

export const queryRangeV5RawResponse = <T>(
	rows: Array<{ timestamp: string; data: T }>,
	options: ResponseOptions & {
		hasMore?: boolean;
		/** `trace` for the root-span views, which answer on the same shape. */
		type?: Extract<RequestType, 'raw' | 'trace'>;
	} = {},
): MetricRangePayloadV5 => {
	const { queryName = 'A', hasMore = false, type = 'raw', warning } = options;

	return {
		data: {
			warning,
			type,
			data: {
				results: [
					{
						queryName,
						nextCursor: hasMore ? 'next-cursor-token' : '',
						rows,
					},
				],
			},
			meta: {
				rowsScanned: rows.length,
				bytesScanned: 0,
				durationMs: 0,
				stepIntervals: {},
			},
		},
	};
};

export interface TimeSeriesPointsOptions {
	/** Epoch milliseconds, as `query_range` sends them. */
	start: number;
	end: number;
	points?: number;
	base: number;
	amplitude: number;
	seed?: number;
}

/**
 * Points spread evenly across the requested window, so a chart drawn from them
 * lands inside whatever range the page asked for. The wave is derived from the
 * index rather than random, so a re-render redraws the same line.
 */
export const timeSeriesPoints = ({
	start,
	end,
	points = 30,
	base,
	amplitude,
	seed = 0,
}: TimeSeriesPointsOptions): TimeSeriesValue[] => {
	const step = (end - start) / Math.max(points - 1, 1);

	return Array.from({ length: points }, (_unused, index) => ({
		timestamp: Math.round(start + index * step),
		value:
			base +
			amplitude * Math.sin((index + seed) / 3) +
			amplitude * 0.3 * Math.cos((index + seed) / 7),
	}));
};

export interface TimeSeriesResult {
	/** The query or formula the series answers for, as the request named it. */
	queryName: string;
	series: TimeSeries[];
	alias?: string;
}

export const queryRangeV5TimeSeriesResponse = (
	results: TimeSeriesResult[],
	{ warning }: Pick<ResponseOptions, 'warning'> = {},
): MetricRangePayloadV5 => ({
	data: {
		warning,
		type: 'time_series',
		data: {
			results: results.map(({ queryName, series, alias = '' }) => ({
				queryName,
				aggregations: [{ index: 0, alias, meta: {}, series }],
			})),
		},
		meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0, stepIntervals: {} },
	},
});

/**
 * The v3 shapes, which the legacy dashboard path still answers on: `GridCard`
 * without a `version` prop and `useGetValueFromWidget` both go to
 * `/api/v3/query_range` or `/api/v4/query_range` rather than v5.
 */
export interface QueryRangeV3Body extends MetricRangePayloadV3 {
	status: string;
}

export const v3Series = (
	labels: Record<string, string>,
	values: SeriesItem['values'],
): SeriesItem => ({
	labels,
	labelsArray: Object.entries(labels).map(([key, value]) => ({ [key]: value })),
	values,
});

/** Same wave as `timeSeriesPoints`, in the v3 spelling: values are strings. */
export const v3TimeSeriesValues = ({
	start,
	end,
	points = 30,
	base,
	amplitude,
	seed = 0,
}: TimeSeriesPointsOptions): SeriesItem['values'] =>
	timeSeriesPoints({ start, end, points, base, amplitude, seed }).map(
		({ timestamp, value }) => ({
			timestamp,
			value: String(Number(value.toFixed(4))),
		}),
	);

export interface V3TimeSeriesResult {
	queryName: string;
	series: SeriesItem[];
	legend?: string;
}

export const queryRangeV3TimeSeriesResponse = (
	results: V3TimeSeriesResult[],
): QueryRangeV3Body => ({
	status: 'success',
	data: {
		resultType: 'matrix',
		result: results.map(({ queryName, series, legend }) => ({
			queryName,
			legend,
			series,
			list: null,
		})),
	},
});

export interface V3TableResult {
	queryName: string;
	columns: Column[];
	rows: Array<Record<string, string | number>>;
}

export const queryRangeV3TableResponse = (
	results: V3TableResult[],
): QueryRangeV3Body => ({
	status: 'success',
	data: {
		resultType: 'table',
		result: results.map(({ queryName, columns, rows }) => ({
			queryName,
			series: null,
			list: null,
			table: { columns, rows: rows.map((data) => ({ data })) },
		})),
	},
});

export const queryRangeV3EmptyResponse = (
	queryNames: string[],
): QueryRangeV3Body => ({
	status: 'success',
	data: {
		resultType: 'matrix',
		result: queryNames.map((queryName) => ({
			queryName,
			series: [],
			list: null,
		})),
	},
});

/**
 * Every builder-query panel asks for the same shape back, keyed by `queryName`,
 * so a page whose widgets are all builder queries answers them from the request
 * rather than one handler per widget: one series (or row) per group-by
 * combination the query asked for, and a single one where it grouped by nothing.
 */
export interface BuilderResponseOptions {
	/** Series per time-series query, or rows per table query. */
	count?: number;
	/** Values a group-by key is given, so a legend reads like the real one. */
	labelValues?: Record<string, readonly string[]>;
}

const builderLabelValue = (
	key: string,
	index: number,
	labelValues: Record<string, readonly string[]>,
): string => {
	const pool = labelValues[key];

	return pool ? pool[index % pool.length] : `${key}-${index + 1}`;
};

const builderGroupByKeys = (query: {
	groupBy?: Array<{ key: string }>;
}): string[] => (query.groupBy ?? []).map((attribute) => attribute.key);

interface BuilderQueryShape {
	queryName: string;
	legend?: string;
	disabled?: boolean;
	groupBy?: Array<{ key: string }>;
}

interface BuilderRequestShape {
	start: number;
	end: number;
	compositeQuery: {
		panelType?: string;
		builderQueries?: Record<string, BuilderQueryShape>;
	};
}

const allQueries = (body: BuilderRequestShape): BuilderQueryShape[] =>
	Object.values(body.compositeQuery.builderQueries ?? {});

const enabledQueries = (body: BuilderRequestShape): BuilderQueryShape[] =>
	allQueries(body).filter((query) => !query.disabled);

/**
 * A formula carries no `groupBy` of its own: it is grouped by whatever the
 * queries it combines were, so its series take the same labels and a `{{key}}`
 * legend resolves on it too. Those queries are usually disabled — the widget
 * draws the formula alone — so the group-by is read off every query in the
 * request, not just the ones that answer.
 */
const keysFor = (
	query: BuilderQueryShape,
	queries: BuilderQueryShape[],
): string[] =>
	query.groupBy !== undefined
		? builderGroupByKeys(query)
		: [
				...new Set(
					queries
						.filter((candidate) => candidate.groupBy !== undefined)
						.flatMap(builderGroupByKeys),
				),
			];

export const builderTimeSeriesResponse = (
	body: BuilderRequestShape,
	{ count = 1, labelValues = {} }: BuilderResponseOptions = {},
): QueryRangeV3Body => {
	const { start, end } = body;
	const isValue = body.compositeQuery.panelType === 'value';

	const queries = allQueries(body);

	return queryRangeV3TimeSeriesResponse(
		enabledQueries(body).map((query, queryIndex) => {
			const keys = keysFor(query, queries);
			const seriesCount = isValue || !keys.length ? Math.min(count, 1) : count;

			return {
				queryName: query.queryName,
				legend: query.legend,
				series: Array.from({ length: seriesCount }, (_unused, seriesIndex) =>
					v3Series(
						Object.fromEntries(
							keys.map((key) => [
								key,
								builderLabelValue(key, seriesIndex, labelValues),
							]),
						),
						v3TimeSeriesValues({
							start,
							end,
							points: isValue ? 1 : 30,
							base: 40 + queryIndex * 15 + seriesIndex * 8,
							amplitude: 12 + seriesIndex * 3,
							seed: queryIndex * 5 + seriesIndex,
						}),
					),
				),
			};
		}),
	);
};

export const builderTableResponse = (
	body: BuilderRequestShape,
	{ count = 1, labelValues = {} }: BuilderResponseOptions = {},
): QueryRangeV3Body => {
	const queries = enabledQueries(body);
	const keys = [
		...new Set(queries.flatMap((query) => keysFor(query, allQueries(body)))),
	];

	const columns: Column[] = [
		...keys.map((name) => ({ name, queryName: '', isValueColumn: false })),
		...queries.map((query) => ({
			name: query.queryName,
			queryName: query.queryName,
			isValueColumn: true,
		})),
	];

	const rows = Array.from({ length: count }, (_unused, index) => ({
		data: {
			...Object.fromEntries(
				keys.map((key) => [key, builderLabelValue(key, index, labelValues)]),
			),
			...Object.fromEntries(
				queries.map((query, queryIndex) => [
					query.queryName,
					seededMetricValue(index + queryIndex, 20 + queryIndex * 30, 60),
				]),
			),
		},
	}));

	return {
		status: 'success',
		data: {
			resultType: 'table',
			result: [
				{ queryName: 'A', series: null, list: null, table: { columns, rows } },
			],
		},
	};
};

/** Derived from the index rather than random, so a refetch redraws the same values. */
export const seededMetricValue = (
	index: number,
	base: number,
	spread: number,
): number => Number((base + (spread * ((index * 37) % 100)) / 100).toFixed(2));

export const queryRangeV3ForRequest = (
	body: BuilderRequestShape,
	options: BuilderResponseOptions = {},
): QueryRangeV3Body =>
	body.compositeQuery.panelType === 'table'
		? builderTableResponse(body, options)
		: builderTimeSeriesResponse(body, options);
