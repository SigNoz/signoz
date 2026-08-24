/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	MetricRangePayloadV5,
	TimeSeries,
	TimeSeriesValue,
} from 'types/api/v5/queryRange';

/** Typed builders for the query_range v5 response shapes. */

export const queryRangeV5ScalarResponse = (
	value: number,
	queryName = 'A',
): MetricRangePayloadV5 => ({
	data: {
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
	options: { queryName?: string; hasMore?: boolean } = {},
): MetricRangePayloadV5 => {
	const { queryName = 'A', hasMore = false } = options;

	return {
		data: {
			type: 'raw',
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
): MetricRangePayloadV5 => ({
	data: {
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
