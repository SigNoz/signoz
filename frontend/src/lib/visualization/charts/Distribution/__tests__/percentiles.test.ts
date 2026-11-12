import { StackMode } from 'lib/uPlotV2/config/types';

import { resolveDistributionBars, resolveDistributionXAxis } from '../layout';
import {
	computeDistributionPercentiles,
	formatPercentileBadge,
	formatPercentileName,
	formatPercentileValue,
	groupPercentileMarkers,
	layoutMarkerLabels,
	resolveHoveredMarker,
	resolveNearestSeries,
} from '../percentiles';

// Buckets ≤ 10, (10, 20], (20, 40], > 40 in slots [0, 1] … [3, 4].
const xAxis = resolveDistributionXAxis([10, 20, 40]);

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

		expect(p50.axisValue).toBe(1.5);
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

		expect(p99).toMatchObject({ value: 40, axisValue: 3, isOverflow: true });
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

describe('formatPercentileName', () => {
	it('keeps fractional percentile names short', () => {
		expect(formatPercentileName(99.9)).toBe('p99.9');
		expect(formatPercentileName(50)).toBe('p50');
	});
});

describe('percentile marker groups', () => {
	const formatBound = (value: number): string => `${value} ms`;
	const p50 = { percentile: 50, value: 15, axisValue: 1.5, isOverflow: false };
	const p99 = { percentile: 99, value: 40, axisValue: 3, isOverflow: true };
	const p90 = { percentile: 90, value: 40, axisValue: 3, isOverflow: true };

	it('groups markers on the same spot, lowest percentile first', () => {
		expect(groupPercentileMarkers([p50, p99, p90])).toStrictEqual([
			[p50],
			[p90, p99],
		]);
	});

	it('names a group by its lowest percentile', () => {
		expect(formatPercentileBadge([p50])).toBe('p50');
		expect(formatPercentileBadge([p90, p99])).toBe('p90+');
	});

	it('shows the estimate, or the overflow bound once for the group', () => {
		expect(formatPercentileValue([p50], formatBound)).toBe('p50 ≈ 15 ms');
		expect(formatPercentileValue([p90, p99], formatBound)).toBe(
			'p90, p99 > 40 ms',
		);
	});
});

describe('resolveHoveredMarker', () => {
	const areas = [
		{
			x: 100,
			badges: [
				{ left: 92, right: 108, top: 0, bottom: 16 },
				{ left: 92, right: 108, top: 184, bottom: 200 },
			],
		},
		{
			x: 120,
			badges: [{ left: 112, right: 128, top: 18, bottom: 34 }],
		},
	];

	it('picks the line nearest x within the tolerance', () => {
		expect(resolveHoveredMarker(areas, 103, 100, 4)).toBe(0);
		expect(resolveHoveredMarker(areas, 117, 100, 4)).toBe(1);
		expect(resolveHoveredMarker(areas, 110, 100, 4)).toBeNull();
	});

	it('picks the marker whose badge is under the cursor', () => {
		expect(resolveHoveredMarker(areas, 107, 190, 4)).toBe(0);
		expect(resolveHoveredMarker(areas, 126, 20, 4)).toBe(1);
	});
});

describe('resolveNearestSeries', () => {
	const counts = [
		[0, 4, 0, 0],
		[0, 6, 0, 0],
	];
	const stacked = resolveDistributionBars({
		xAxis,
		counts,
		visible: [true, true],
		stack: StackMode.Normal,
		isLogY: false,
	});

	it('names the group whose bar is under the point', () => {
		expect(resolveNearestSeries(stacked, 1, 1.5, 2)).toBe(0);
		expect(resolveNearestSeries(stacked, 1, 1.5, 8)).toBe(1);
	});

	it('takes the vertically nearest group off the bars, as a bar chart does', () => {
		expect(resolveNearestSeries(stacked, 1, 1.5, 50)).toBe(1);
	});

	it('is null over an empty bucket', () => {
		expect(resolveNearestSeries(stacked, 2, 2.5, 1)).toBeNull();
	});

	it('picks the sub-bar under the cursor side by side', () => {
		const sideBySide = resolveDistributionBars({
			xAxis,
			counts,
			visible: [true, true],
			stack: StackMode.None,
			isLogY: false,
		});

		expect(resolveNearestSeries(sideBySide, 1, 1.25, 50)).toBe(0);
		expect(resolveNearestSeries(sideBySide, 1, 1.75, 1)).toBe(1);
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
