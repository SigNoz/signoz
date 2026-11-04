import { StackMode } from 'lib/uPlotV2/config/types';

import {
	cropDistributionXAxis,
	LOG_Y_BASE,
	resolveDistributionBars,
	resolveDistributionXAxis,
	sumVisibleCounts,
	thinLabelledSplits,
} from '../layout';
import { DistributionXScale } from '../types';

function widths(edges: number[]): number[] {
	return edges.slice(1).map((edge, index) => edge - edges[index]);
}

describe('resolveDistributionXAxis', () => {
	it('lays N bounds out as N + 1 buckets, overflow last', () => {
		const axis = resolveDistributionXAxis(
			[10, 20, 30],
			DistributionXScale.Linear,
		);

		expect(axis.rows).toHaveLength(4);
		expect(axis.rows[0].isUnderflow).toBe(true);
		expect(axis.rows[3]).toMatchObject({ lower: 30, isOverflow: true });
		expect(axis.edges).toHaveLength(5);
	});

	it('keeps auto linear when the bounds span under two decades', () => {
		const auto = resolveDistributionXAxis(
			[100, 200, 400],
			DistributionXScale.Auto,
		);
		const linear = resolveDistributionXAxis(
			[100, 200, 400],
			DistributionXScale.Linear,
		);

		expect(auto.edges).toStrictEqual(linear.edges);
	});

	it('turns auto log once the bounds span two decades', () => {
		const axis = resolveDistributionXAxis([1, 10, 100], DistributionXScale.Auto);

		expect(axis.splits).toStrictEqual([0, 1, 2]);
	});

	it('gives every bucket the same width on ordinal, ticks on the bounds', () => {
		const axis = resolveDistributionXAxis(
			[0, 5, 10, 25, 1000],
			DistributionXScale.Ordinal,
		);

		expect(widths(axis.edges)).toStrictEqual([1, 1, 1, 1, 1, 1]);
		expect(axis.splits).toStrictEqual([1, 2, 3, 4, 5]);
		expect(axis.overflowSplit).toBe(6);
		expect(axis.toBucketValue(3.5)).toBe(17.5);
	});
});

describe('cropDistributionXAxis', () => {
	it('stops one bucket past the last occupied one', () => {
		const axis = resolveDistributionXAxis(
			[1, 2, 3, 4],
			DistributionXScale.Ordinal,
		);

		const cropped = cropDistributionXAxis(axis, [1, 5, 0, 0, 0]);

		expect(cropped.max).toBe(3);
		expect(cropped.overflowSplit).toBeNull();
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
	const xAxis = resolveDistributionXAxis([1, 2], DistributionXScale.Ordinal);
	const counts = [
		[4, 6, 0],
		[1, 3, 2],
	];

	it('stacks visible series in each bucket under normal', () => {
		const { rects, yMax } = resolveDistributionBars({
			xAxis,
			counts,
			visible: [true, true],
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
			visible: [true, true],
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
			visible: [true, true],
			stack: StackMode.Percent,
			isLogY: false,
		});

		expect(rects[0][0]).toMatchObject({ y0: 0, y1: 80 });
		expect(rects[1][0]).toMatchObject({ y0: 80, y1: 100 });
		expect(yMax).toBe(100);
	});

	it('splits the bucket width between visible series under none', () => {
		const { rects, yMax } = resolveDistributionBars({
			xAxis,
			counts,
			visible: [true, true],
			stack: StackMode.None,
			isLogY: false,
		});

		expect(rects[0][0]).toMatchObject({ x0: 0, x1: 0.5, y0: 0, y1: 4 });
		expect(rects[1][0]).toMatchObject({ x0: 0.5, x1: 1, y0: 0, y1: 1 });
		expect(yMax).toBe(6);
	});

	it('leaves a hidden series out of the stack and the width split', () => {
		const { rects } = resolveDistributionBars({
			xAxis,
			counts,
			visible: [false, true],
			stack: StackMode.None,
			isLogY: false,
		});

		expect(rects[0]).toStrictEqual([]);
		expect(rects[1][0]).toMatchObject({ x0: 0, x1: 1, y1: 1 });
	});

	it('starts bars at the log base and skips zero counts', () => {
		const { rects } = resolveDistributionBars({
			xAxis,
			counts,
			visible: [true, true],
			stack: StackMode.Normal,
			isLogY: true,
		});

		expect(rects[0].map(({ y0 }) => y0)).toStrictEqual([LOG_Y_BASE, LOG_Y_BASE]);
		expect(rects[0].map(({ bucketIndex }) => bucketIndex)).toStrictEqual([0, 1]);
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
