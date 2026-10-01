import { DistributionType } from 'lib/uPlotV2/config/types';
import uPlot from 'uplot';

import { createScatterRange, type ScatterRangeOptions } from '../scatterRange';

/** A 220px-tall, 420px-wide plot at a device pixel ratio of 1. */
const plot = { bbox: { width: 420, height: 220 } } as unknown as uPlot;

function rangeOf(
	options: Partial<ScatterRangeOptions>,
	dataMin: number | null,
	dataMax: number | null,
): [number, number] {
	const range = createScatterRange({
		dimension: 'y',
		marginPx: 10,
		distribution: DistributionType.Linear,
		...options,
	}) as (u: uPlot, min: number | null, max: number | null) => [number, number];
	return range(plot, dataMin, dataMax);
}

describe('createScatterRange', () => {
	beforeAll(() => {
		Object.defineProperty(uPlot, 'pxRatio', { value: 1, configurable: true });
	});

	it('widens a linear range so the data sits marginPx inside each edge', () => {
		// 200px of data inside 220px: 10px at each end is 1/20 of the span.
		expect(rangeOf({}, 0, 100)).toStrictEqual([-5, 105]);
	});

	it('measures the margin along its own axis', () => {
		// 400px of data inside 420px.
		expect(rangeOf({ dimension: 'x' }, 0, 100)).toStrictEqual([-2.5, 102.5]);
	});

	it('pads a log range in decades, without snapping to the next power of ten', () => {
		const [min, max] = rangeOf(
			{ distribution: DistributionType.Logarithmic },
			1,
			10,
		);
		expect(Math.log10(min)).toBeCloseTo(-0.05);
		expect(Math.log10(max)).toBeCloseTo(1.05);
	});

	it('pads a symmetric log range in its asinh space', () => {
		const [min, max] = rangeOf(
			{ distribution: DistributionType.SymmetricLog, asinhThreshold: 2 },
			0,
			20,
		);
		const span = Math.asinh(10);
		expect(Math.asinh(min / 2)).toBeCloseTo(-span / 20);
		expect(Math.asinh(max / 2)).toBeCloseTo(span + span / 20);
	});

	it('stretches to the soft limits before padding', () => {
		expect(rangeOf({ softMin: 0, softMax: 200 }, 50, 100)).toStrictEqual([
			-10, 210,
		]);
	});

	it('ignores a soft min at or below zero on a log scale', () => {
		const [min] = rangeOf(
			{ distribution: DistributionType.Logarithmic, softMin: 0 },
			10,
			100,
		);
		expect(min).toBeGreaterThan(0);
	});

	it('spreads a single value around itself', () => {
		const [min, max] = rangeOf({}, 5, 5);
		expect(min).toBeLessThan(5);
		expect(max).toBeGreaterThan(5);
		expect(5 - min).toBeCloseTo(max - 5);
	});

	it('falls back to a unit range with no data', () => {
		expect(rangeOf({}, null, null)).toStrictEqual([0, 1]);
		expect(
			rangeOf({ distribution: DistributionType.Logarithmic }, null, null),
		).toStrictEqual([1, 10]);
	});

	it('skips the margin on a plot too small to hold it', () => {
		const tiny = { bbox: { width: 15, height: 15 } } as unknown as uPlot;
		const range = createScatterRange({
			dimension: 'y',
			marginPx: 10,
			distribution: DistributionType.Linear,
		}) as (u: uPlot, min: number, max: number) => [number, number];
		expect(range(tiny, 0, 100)).toStrictEqual([0, 100]);
	});
});
