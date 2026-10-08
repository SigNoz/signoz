import type uPlot from 'uplot';

import { logScaleSplits, spacedLogLabels } from '../logGridSplits';

describe('logScaleSplits', () => {
	const splitsFor = (min: number, max: number): number[] =>
		(
			logScaleSplits as (
				u: uPlot,
				axisIdx: number,
				min: number,
				max: number,
			) => number[]
		)({} as uPlot, 0, min, max);

	it('splits at 1, 2 and 5 × 10ⁿ inside an unsnapped range', () => {
		expect(splitsFor(10.6, 990)).toStrictEqual([20, 50, 100, 200, 500]);
	});

	it('includes the ends when they fall on a split', () => {
		expect(splitsFor(0.1, 10)).toStrictEqual([0.1, 0.2, 0.5, 1, 2, 5, 10]);
	});

	it('is empty for a range a log scale cannot hold', () => {
		expect(splitsFor(0, 10)).toStrictEqual([]);
		expect(splitsFor(5, 5)).toStrictEqual([]);
	});
});

describe('spacedLogLabels', () => {
	// 100px per decade.
	const plot = {
		axes: [{ scale: 'x' }],
		valToPos: (value: number): number => Math.log10(value) * 100,
	} as unknown as uPlot;
	const label = (splits: number[], space: number): (number | null)[] =>
		spacedLogLabels(plot, splits, 0, space, 0) as (number | null)[];

	it('always labels the powers of ten', () => {
		expect(label([10, 20, 50, 100], 200)).toStrictEqual([10, null, null, 100]);
	});

	it('adds a 2 or 5 that clears the labels already kept', () => {
		// 20 is 30px from 10; 50 is 70px from 10 and 30px from 100.
		expect(label([10, 20, 50, 100], 25)).toStrictEqual([10, 20, 50, 100]);
		expect(label([10, 20, 50, 100], 40)).toStrictEqual([10, null, null, 100]);
	});

	it('labels both ends of a range spanning under a decade', () => {
		// 100 sits at 200px; 20 (130px) and 500 (270px) clear it, 50 and 200 do not.
		expect(label([20, 50, 100, 200, 500], 60)).toStrictEqual([
			20,
			null,
			100,
			null,
			500,
		]);
	});
});
