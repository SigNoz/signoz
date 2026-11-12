import { resolveDistributionXAxis } from '../layout';
import {
	computeDistributionPercentiles,
	formatPercentileBadge,
	formatPercentileName,
	formatPercentileValue,
	groupPercentileMarkers,
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
