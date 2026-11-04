import { StackMode } from 'lib/uPlotV2/config/types';

import { resolveDistributionBars, resolveDistributionXAxis } from '../layout';
import {
	computeDistributionPercentiles,
	formatPercentileMarker,
	formatPercentileName,
	layoutMarkerLabels,
	resolveHoveredSeries,
} from '../percentiles';
import { DistributionXScale } from '../types';

// Buckets: ≤ 10, (10, 20], (20, 40], > 40.
const xAxis = resolveDistributionXAxis([10, 20, 40], DistributionXScale.Linear);

describe('computeDistributionPercentiles', () => {
	it('interpolates inside the bucket holding the rank, as histogram_quantile does', () => {
		const markers = computeDistributionPercentiles({
			xAxis,
			totals: [10, 20, 10, 0],
			percentiles: [50, 90],
		});

		expect(markers.map(({ value }) => value)).toStrictEqual([15, 32]);
		expect(markers.every(({ isOverflow }) => !isOverflow)).toBe(true);
	});

	it('places the marker the same fraction across the bucket on the axis', () => {
		const [p50] = computeDistributionPercentiles({
			xAxis,
			totals: [10, 20, 10, 0],
			percentiles: [50],
		});

		expect(p50.axisValue).toBe(15);
	});

	it('starts the lowest bucket at zero', () => {
		const [p10] = computeDistributionPercentiles({
			xAxis,
			totals: [10, 20, 10, 0],
			percentiles: [10],
		});

		expect(p10.value).toBe(4);
	});

	it('reports a percentile in overflow as above the last bound, at its left edge', () => {
		const [p99] = computeDistributionPercentiles({
			xAxis,
			totals: [0, 0, 10, 10],
			percentiles: [99],
		});

		expect(p99).toMatchObject({ value: 40, axisValue: 40, isOverflow: true });
	});

	it('marks nothing when every count is zero', () => {
		expect(
			computeDistributionPercentiles({
				xAxis,
				totals: [0, 0, 0, 0],
				percentiles: [50],
			}),
		).toStrictEqual([]);
	});
});

describe('formatPercentileMarker', () => {
	const formatBound = (value: number): string => `${value} ms`;

	it('labels an estimate with a tilde and an overflow with its bound', () => {
		expect(
			formatPercentileMarker(
				{ percentile: 99, value: 32, axisValue: 32, isOverflow: false },
				formatBound,
			),
		).toBe('~p99');
		expect(
			formatPercentileMarker(
				{ percentile: 99.9, value: 40, axisValue: 40, isOverflow: true },
				formatBound,
			),
		).toBe('p99.9 > 40 ms');
	});

	it('keeps fractional percentile names short', () => {
		expect(formatPercentileName(99.9)).toBe('p99.9');
		expect(formatPercentileName(50)).toBe('p50');
	});
});

describe('resolveHoveredSeries', () => {
	const layout = resolveDistributionBars({
		xAxis,
		counts: [
			[0, 4, 0, 0],
			[0, 6, 0, 0],
		],
		visible: [true, true],
		stack: StackMode.Normal,
		isLogY: false,
	});

	it('names the series whose bar is under the point', () => {
		expect(resolveHoveredSeries(layout, 15, 2)).toBe(0);
		expect(resolveHoveredSeries(layout, 15, 8)).toBe(1);
	});

	it('is null above the stack or in an empty bucket', () => {
		expect(resolveHoveredSeries(layout, 15, 11)).toBeNull();
		expect(resolveHoveredSeries(layout, 30, 1)).toBeNull();
	});
});

describe('layoutMarkerLabels', () => {
	it('keeps labels that fit on the first row', () => {
		expect(
			layoutMarkerLabels(
				[
					{ x: 0, width: 20 },
					{ x: 40, width: 20 },
				],
				4,
			),
		).toStrictEqual([0, 0]);
	});

	it('drops a label that would overlap to the next free row', () => {
		expect(
			layoutMarkerLabels(
				[
					{ x: 30, width: 20 },
					{ x: 0, width: 20 },
					{ x: 10, width: 20 },
				],
				4,
			),
		).toStrictEqual([0, 0, 1]);
	});
});
