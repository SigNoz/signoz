import { StackMode } from 'lib/uPlotV2/config/types';

import {
	clampDistributionXAxis,
	cropDistributionXAxis,
	LOG_Y_BASE,
	resolveDistributionBars,
	resolveDistributionXAxis,
	resolveNearestSeries,
	sumVisibleCounts,
	thinLabelledSplits,
} from '../layout';

function widths(edges: number[]): number[] {
	return edges.slice(1).map((edge, index) => edge - edges[index]);
}

describe('resolveDistributionXAxis', () => {
	it('lays N bounds out as N + 1 buckets, overflow last', () => {
		const axis = resolveDistributionXAxis([10, 20, 30]);

		expect(axis.rows).toHaveLength(4);
		expect(axis.rows[0].isUnderflow).toBe(true);
		expect(axis.rows[3]).toMatchObject({ lower: 30, isOverflow: true });
		expect(axis.edges).toHaveLength(5);
	});

	it('gives every bucket the same width, ticks on the bounds', () => {
		const axis = resolveDistributionXAxis([0, 5, 10, 25, 1000]);

		expect(widths(axis.edges)).toStrictEqual([1, 1, 1, 1, 1, 1]);
		expect(axis.splits).toStrictEqual([1, 2, 3, 4, 5]);
		expect(axis.overflowSplit).toBe(6);
		expect(axis.toBucketValue(3.5)).toBe(17.5);
	});
});

describe('cropDistributionXAxis', () => {
	it('stops one bucket past the last occupied one', () => {
		const axis = resolveDistributionXAxis([1, 2, 3, 4]);

		const cropped = cropDistributionXAxis(axis, [1, 5, 0, 0, 0]);

		expect(cropped.max).toBe(3);
		expect(cropped.overflowSplit).toBeNull();
	});
});

describe('clampDistributionXAxis', () => {
	// Buckets ≤ 10, (10, 20], (20, 40], (40, 80], > 80 in slots [0, 1] … [4, 5].
	const axis = resolveDistributionXAxis([10, 20, 40, 80]);

	it('keeps every bucket without a range', () => {
		expect(clampDistributionXAxis(axis)).toStrictEqual(axis);
	});

	it('hides buckets wholly outside the range, keeping straddling ones whole', () => {
		const clamped = clampDistributionXAxis(axis, 20, 50);

		expect([clamped.min, clamped.max]).toStrictEqual([2, 4]);
		expect(clamped.overflowSplit).toBeNull();
	});

	it('keeps the overflow tick while the overflow bucket shows', () => {
		const clamped = clampDistributionXAxis(axis, 15);

		expect([clamped.min, clamped.max]).toStrictEqual([1, 5]);
		expect(clamped.overflowSplit).toBe(5);
	});

	it('keeps one bucket when the range misses them all', () => {
		const clamped = clampDistributionXAxis(axis, 1000);

		expect([clamped.min, clamped.max]).toStrictEqual([4, 5]);
	});

	it('narrows an already cropped axis, never widening it', () => {
		const cropped = cropDistributionXAxis(axis, [1, 5, 0, 0, 0]);

		expect(clampDistributionXAxis(cropped, 15).max).toBe(cropped.max);
	});
});

describe('sumVisibleCounts', () => {
	it('adds only the visible series', () => {
		expect(
			sumVisibleCounts(
				[
					[1, 2],
					[10, 20],
					[100, 200],
				],
				[true, false, true],
				2,
			),
		).toStrictEqual([101, 202]);
	});
});

describe('resolveDistributionBars', () => {
	const xAxis = resolveDistributionXAxis([1, 2]);
	const counts = [
		[4, 6, 0],
		[1, 3, 2],
	];

	it('stacks series in each bucket under normal', () => {
		const { rects, yMax } = resolveDistributionBars({
			xAxis,
			counts,
			stack: StackMode.Normal,
			isLogY: false,
		});

		expect(rects[0].map(({ y0, y1 }) => [y0, y1])).toStrictEqual([
			[0, 4],
			[0, 6],
		]);
		expect(rects[1].map(({ y0, y1 }) => [y0, y1])).toStrictEqual([
			[4, 5],
			[6, 9],
			[0, 2],
		]);
		expect(yMax).toBe(9);
	});

	it('marks the overflow bucket hatched', () => {
		const { rects } = resolveDistributionBars({
			xAxis,
			counts,
			stack: StackMode.Normal,
			isLogY: false,
		});

		expect(rects[1].map(({ hatched }) => hatched)).toStrictEqual([
			false,
			false,
			true,
		]);
	});

	it('stacks shares of each bucket under percent', () => {
		const { rects, yMax } = resolveDistributionBars({
			xAxis,
			counts,
			stack: StackMode.Percent,
			isLogY: false,
		});

		expect(rects[0][0]).toMatchObject({ y0: 0, y1: 80 });
		expect(rects[1][0]).toMatchObject({ y0: 80, y1: 100 });
		expect(yMax).toBe(100);
	});

	it('splits the bucket width between series under none', () => {
		const { rects, yMax } = resolveDistributionBars({
			xAxis,
			counts,
			stack: StackMode.None,
			isLogY: false,
		});

		expect(rects[0][0]).toMatchObject({ x0: 0, x1: 0.5, y0: 0, y1: 4 });
		expect(rects[1][0]).toMatchObject({ x0: 0.5, x1: 1, y0: 0, y1: 1 });
		expect(yMax).toBe(6);
	});

	it('starts bars at the log base and skips zero counts', () => {
		const { rects } = resolveDistributionBars({
			xAxis,
			counts,
			stack: StackMode.Normal,
			isLogY: true,
		});

		expect(rects[0].map(({ y0 }) => y0)).toStrictEqual([LOG_Y_BASE, LOG_Y_BASE]);
		expect(rects[0].map(({ bucketIndex }) => bucketIndex)).toStrictEqual([0, 1]);
	});

	it('skips bars whose top stays under the log base, never inverting one', () => {
		const fractional = [
			[0.5, 3, 0],
			[0.25, 0.5, 2],
		];
		const stacked = resolveDistributionBars({
			xAxis,
			counts: fractional,
			stack: StackMode.Normal,
			isLogY: true,
		});
		const sideBySide = resolveDistributionBars({
			xAxis,
			counts: fractional,
			stack: StackMode.None,
			isLogY: true,
		});

		expect(
			stacked.rects.map((rects) => rects.map(({ y0, y1 }) => [y0, y1])),
		).toStrictEqual([
			[[LOG_Y_BASE, 3]],
			[
				[3, 3.5],
				[LOG_Y_BASE, 2],
			],
		]);
		expect(
			sideBySide.rects.map((rects) => rects.map(({ bucketIndex }) => bucketIndex)),
		).toStrictEqual([[1], [2]]);
	});
});

describe('thinLabelledSplits', () => {
	it('keeps labels that clear each other by the gap', () => {
		expect(
			thinLabelledSplits({
				positions: [0, 50, 100],
				widths: [20, 20, 20],
				gap: 10,
			}),
		).toStrictEqual([0, 1, 2]);
	});

	it('drops a wide label that would touch its neighbour, keeping the rightmost', () => {
		// 16.67 mins-wide labels 60 px apart: each needs 70 px of centre distance.
		expect(
			thinLabelledSplits({
				positions: [0, 60, 120, 180],
				widths: [60, 60, 60, 60],
				gap: 10,
			}),
		).toStrictEqual([1, 3]);
	});
});

describe('resolveNearestSeries', () => {
	// Buckets ≤ 10, (10, 20], (20, 40], > 40 in slots [0, 1] … [3, 4].
	const xAxis = resolveDistributionXAxis([10, 20, 40]);
	const counts = [
		[0, 4, 0, 0],
		[0, 6, 0, 0],
	];
	const stacked = resolveDistributionBars({
		xAxis,
		counts,
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
			stack: StackMode.None,
			isLogY: false,
		});

		expect(resolveNearestSeries(sideBySide, 1, 1.25, 50)).toBe(0);
		expect(resolveNearestSeries(sideBySide, 1, 1.75, 1)).toBe(1);
	});
});
