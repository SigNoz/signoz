// Feature: state-timeline-panel, Properties 1, 2, 3: Data transformation correctness
// **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 4.7, 7.2, 7.4**

import * as fc from 'fast-check';
import { QueryDataV3, SeriesItem } from 'types/api/widgets/getQuery';

import { transformSeriesToSwimLanes, TimeRange } from '../transformData';

/**
 * Arbitrary: generates a non-empty label key (alphanumeric, 1-10 chars).
 */
const labelKeyArb = fc.string({ minLength: 1, maxLength: 10 }).filter(
	(s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s),
);

/**
 * Arbitrary: generates a label value (1-20 chars, printable).
 */
const labelValueArb = fc.string({ minLength: 1, maxLength: 20 }).filter(
	(s) => s.trim().length > 0,
);

/**
 * Arbitrary: generates a labels record with 1-3 key-value pairs.
 */
const labelsArb = fc
	.array(fc.tuple(labelKeyArb, labelValueArb), { minLength: 1, maxLength: 3 })
	.map((pairs) => Object.fromEntries(pairs));

/**
 * Arbitrary: generates a sorted (ascending) array of unique timestamps.
 * Timestamps are in epoch seconds between 1000 and 100000.
 */
function sortedTimestampsArb(
	minLength: number,
	maxLength: number,
): fc.Arbitrary<number[]> {
	return fc
		.array(fc.integer({ min: 1000, max: 100000 }), {
			minLength,
			maxLength,
		})
		.map((arr) => [...new Set(arr)].sort((a, b) => a - b))
		.filter((arr) => arr.length >= minLength);
}

/**
 * Arbitrary: generates a numeric value as a string.
 */
const numericValueArb = fc
	.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true })
	.map((v) => String(v));

/**
 * Arbitrary: generates a single SeriesItem with sorted timestamps and numeric values.
 */
const seriesItemArb: fc.Arbitrary<SeriesItem> = fc
	.tuple(labelsArb, sortedTimestampsArb(1, 20))
	.chain(([labels, timestamps]) =>
		fc.tuple(
			fc.constant(labels),
			fc.constant(timestamps),
			fc.array(numericValueArb, {
				minLength: timestamps.length,
				maxLength: timestamps.length,
			}),
		),
	)
	.map(([labels, timestamps, values]) => ({
		labels,
		labelsArray: [labels],
		values: timestamps.map((ts, i) => ({ timestamp: ts, value: values[i] })),
	}));

/**
 * Arbitrary: generates a QueryDataV3 object with 0-50 series.
 */
const queryDataArb: fc.Arbitrary<QueryDataV3> = fc
	.array(seriesItemArb, { minLength: 0, maxLength: 50 })
	.map((series) => ({
		list: null,
		queryName: 'A',
		series: series.length > 0 ? series : null,
	}));

/**
 * Arbitrary: generates a TimeRange that encompasses all generated series timestamps.
 * The end is always after the last timestamp of any series.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function timeRangeArb(queryData: QueryDataV3[]): fc.Arbitrary<TimeRange> {
	let minTimestamp = 1000;
	let maxTimestamp = 100000;

	for (const qd of queryData) {
		if (qd.series) {
			for (const s of qd.series) {
				if (s.values.length > 0) {
					const first = s.values[0].timestamp;
					const last = s.values[s.values.length - 1].timestamp;
					if (first < minTimestamp) minTimestamp = first;
					if (last > maxTimestamp) maxTimestamp = last;
				}
			}
		}
	}

	return fc.integer({ min: maxTimestamp + 1, max: maxTimestamp + 10000 }).map(
		(end) => ({
			start: minTimestamp,
			end,
		}),
	);
}

describe('Property 1: Data transformation preserves series count and labels', () => {
	it('should produce exactly N rows for N non-empty series', () => {
		fc.assert(
			fc.property(
				queryDataArb.filter(
					(qd) => qd.series !== null && qd.series.length > 0,
				),
				(queryData) => {
					const seriesCount = queryData.series!.length;

					// Build a timeRange that encompasses all timestamps
					let maxTs = 0;
					for (const s of queryData.series!) {
						if (s.values.length > 0) {
							const last = s.values[s.values.length - 1].timestamp;
							if (last > maxTs) maxTs = last;
						}
					}
					const timeRange: TimeRange = { start: 0, end: maxTs + 1000 };

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					expect(result.rows.length).toBe(seriesCount);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should produce rows with labels derived from series labels', () => {
		fc.assert(
			fc.property(
				queryDataArb.filter(
					(qd) => qd.series !== null && qd.series.length > 0,
				),
				(queryData) => {
					let maxTs = 0;
					for (const s of queryData.series!) {
						if (s.values.length > 0) {
							const last = s.values[s.values.length - 1].timestamp;
							if (last > maxTs) maxTs = last;
						}
					}
					const timeRange: TimeRange = { start: 0, end: maxTs + 1000 };

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					// Every row label should be non-undefined
					for (const row of result.rows) {
						expect(typeof row.label).toBe('string');
					}

					// Each row should have seriesLabels matching one of the input series
					const inputLabelsSet = new Set(
						queryData.series!.map((s) =>
							JSON.stringify(s.labels),
						),
					);
					for (const row of result.rows) {
						expect(
							inputLabelsSet.has(JSON.stringify(row.seriesLabels)),
						).toBe(true);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should produce empty rows when series is null', () => {
		const emptyQueryData: QueryDataV3 = {
			list: null,
			queryName: 'A',
			series: null,
		};
		const timeRange: TimeRange = { start: 1000, end: 2000 };

		const result = transformSeriesToSwimLanes(
			[emptyQueryData],
			timeRange,
			[],
			false,
		);

		expect(result.rows.length).toBe(0);
	});
});

describe('Property 2: Swim-lane rows are sorted alphabetically', () => {
	it('should sort rows case-insensitively in ascending order', () => {
		fc.assert(
			fc.property(
				queryDataArb.filter(
					(qd) => qd.series !== null && qd.series.length > 1,
				),
				(queryData) => {
					let maxTs = 0;
					for (const s of queryData.series!) {
						if (s.values.length > 0) {
							const last = s.values[s.values.length - 1].timestamp;
							if (last > maxTs) maxTs = last;
						}
					}
					const timeRange: TimeRange = { start: 0, end: maxTs + 1000 };

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					// Check adjacent pairs are sorted case-insensitively
					for (let i = 0; i < result.rows.length - 1; i++) {
						const current = result.rows[i].label.toLowerCase();
						const next = result.rows[i + 1].label.toLowerCase();
						expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should handle mixed case labels correctly', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.string({ minLength: 1, maxLength: 15 }).filter(
						(s) => s.trim().length > 0,
					),
					{ minLength: 2, maxLength: 20 },
				),
				(labelValues) => {
					// Build series with specific labels for sorting verification
					const series: SeriesItem[] = labelValues.map((val) => ({
						labels: { service: val },
						labelsArray: [{ service: val }],
						values: [{ timestamp: 1000, value: '1' }],
					}));

					const queryData: QueryDataV3 = {
						list: null,
						queryName: 'A',
						series,
					};

					const timeRange: TimeRange = { start: 0, end: 2000 };

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					// Verify case-insensitive sort
					for (let i = 0; i < result.rows.length - 1; i++) {
						const current = result.rows[i].label.toLowerCase();
						const next = result.rows[i + 1].label.toLowerCase();
						expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
					}
				},
			),
			{ numRuns: 100 },
		);
	});
});

describe('Property 3: Segment boundaries are continuous and span the full time range', () => {
	it('should have first segment starting at first timestamp', () => {
		fc.assert(
			fc.property(
				seriesItemArb.filter((s) => s.values.length > 0),
				fc.integer({ min: 200000, max: 300000 }),
				(series, endOffset) => {
					const firstTimestamp = series.values[0].timestamp;
					const lastTimestamp =
						series.values[series.values.length - 1].timestamp;
					const timeRange: TimeRange = {
						start: firstTimestamp - 100,
						end: lastTimestamp + endOffset,
					};

					const queryData: QueryDataV3 = {
						list: null,
						queryName: 'A',
						series: [series],
					};

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					expect(result.rows.length).toBe(1);
					const segments = result.rows[0].segments;
					expect(segments.length).toBe(series.values.length);
					// First segment starts at first timestamp
					expect(segments[0].startTime).toBe(firstTimestamp);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should have last segment ending at timeRange.end', () => {
		fc.assert(
			fc.property(
				seriesItemArb.filter((s) => s.values.length > 0),
				fc.integer({ min: 200000, max: 300000 }),
				(series, endOffset) => {
					const lastTimestamp =
						series.values[series.values.length - 1].timestamp;
					const timeRange: TimeRange = {
						start: series.values[0].timestamp - 100,
						end: lastTimestamp + endOffset,
					};

					const queryData: QueryDataV3 = {
						list: null,
						queryName: 'A',
						series: [series],
					};

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					expect(result.rows.length).toBe(1);
					const segments = result.rows[0].segments;
					// Last segment ends at timeRange.end
					expect(segments[segments.length - 1].endTime).toBe(
						timeRange.end,
					);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should have continuous segments with no gaps between adjacent segments', () => {
		fc.assert(
			fc.property(
				seriesItemArb.filter((s) => s.values.length > 1),
				fc.integer({ min: 200000, max: 300000 }),
				(series, endOffset) => {
					const lastTimestamp =
						series.values[series.values.length - 1].timestamp;
					const timeRange: TimeRange = {
						start: series.values[0].timestamp - 100,
						end: lastTimestamp + endOffset,
					};

					const queryData: QueryDataV3 = {
						list: null,
						queryName: 'A',
						series: [series],
					};

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					expect(result.rows.length).toBe(1);
					const segments = result.rows[0].segments;

					// Verify continuity: each segment's end equals next segment's start
					for (let i = 0; i < segments.length - 1; i++) {
						expect(segments[i].endTime).toBe(segments[i + 1].startTime);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should produce exactly K segments for K data points', () => {
		fc.assert(
			fc.property(
				seriesItemArb.filter((s) => s.values.length > 0),
				fc.integer({ min: 200000, max: 300000 }),
				(series, endOffset) => {
					const lastTimestamp =
						series.values[series.values.length - 1].timestamp;
					const timeRange: TimeRange = {
						start: series.values[0].timestamp - 100,
						end: lastTimestamp + endOffset,
					};

					const queryData: QueryDataV3 = {
						list: null,
						queryName: 'A',
						series: [series],
					};

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					expect(result.rows.length).toBe(1);
					// K data points should produce K segments
					expect(result.rows[0].segments.length).toBe(
						series.values.length,
					);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should handle single data point as a segment spanning to timeRange.end', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1000, max: 50000 }),
				numericValueArb,
				fc.integer({ min: 1000, max: 50000 }),
				(timestamp, value, extraTime) => {
					const timeRange: TimeRange = {
						start: timestamp - 100,
						end: timestamp + extraTime,
					};

					const series: SeriesItem = {
						labels: { key: 'value' },
						labelsArray: [{ key: 'value' }],
						values: [{ timestamp, value }],
					};

					const queryData: QueryDataV3 = {
						list: null,
						queryName: 'A',
						series: [series],
					};

					const result = transformSeriesToSwimLanes(
						[queryData],
						timeRange,
						[],
						false,
					);

					expect(result.rows.length).toBe(1);
					expect(result.rows[0].segments.length).toBe(1);
					expect(result.rows[0].segments[0].startTime).toBe(timestamp);
					expect(result.rows[0].segments[0].endTime).toBe(timeRange.end);
				},
			),
			{ numRuns: 100 },
		);
	});
});
