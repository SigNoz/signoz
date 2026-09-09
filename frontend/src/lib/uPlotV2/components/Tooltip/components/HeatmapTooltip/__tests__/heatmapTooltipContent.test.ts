import { resolveHeatmapYAxis } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { HeatmapAxisScale } from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

import { buildBucketRows, formatColumnRange } from '../heatmapTooltipContent';

const TIMEZONE = 'UTC';
/** 2026-09-02T05:30:00Z. */
const START = 1_788_327_000;

/** Two decimals round every one of these to `0.06 ms` or `0.07 ms`. */
const CLOSE_BOUNDS = [
	0.05731275270029195, 0.059850205043660856, 0.0625, 0.06526711140171336,
	0.0681567332915786,
];
const CLOSE_Y_AXIS = resolveHeatmapYAxis(CLOSE_BOUNDS, HeatmapAxisScale.Log);
const COUNTS = CLOSE_Y_AXIS.rows.map((_, row) => [row]);

describe('formatColumnRange', () => {
	it('dates both ends of the column', () => {
		expect(
			formatColumnRange({ start: START, step: 9 * 3600, timezone: TIMEZONE }),
		).toBe('09/02 05:30 → 09/02 14:30');
	});

	it('carries the date across a column that spans days', () => {
		expect(
			formatColumnRange({ start: START, step: 2 * 86_400, timezone: TIMEZONE }),
		).toBe('09/02 05:30 → 09/04 05:30');
	});

	it('adds seconds for a sub-minute column, which times alone cannot separate', () => {
		expect(
			formatColumnRange({ start: START, step: 30, timezone: TIMEZONE }),
		).toBe('09/02 05:30:00 → 09/02 05:30:30');
	});

	it('reads the day in the panel timezone, not UTC', () => {
		// 05:30Z is the previous evening in Los Angeles, so the same column reads as
		// crossing a date boundary there and not in UTC.
		expect(
			formatColumnRange({
				start: START,
				step: 9 * 3600,
				timezone: 'America/Los_Angeles',
			}),
		).toBe('09/01 22:30 → 09/02 07:30');
	});
});

describe('buildBucketRows', () => {
	it('identifies a row by its place on the axis, which its label cannot', () => {
		const rows = buildBucketRows({
			counts: COUNTS,
			yAxis: CLOSE_Y_AXIS,
			row: 3,
			column: 0,
			yAxisUnit: 'ms',
			decimalPrecision: 2,
		});

		expect(new Set(rows.map((row) => row.label)).size).toBeLessThan(rows.length);
		expect(rows.map((row) => row.row)).toStrictEqual([5, 4, 3, 2, 1]);
		expect(rows.map((row) => row.count)).toStrictEqual([5, 4, 3, 2, 1]);
	});
});
