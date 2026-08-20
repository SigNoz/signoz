import type { MetricRangePayloadV5 } from 'types/api/v5/queryRange';

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
