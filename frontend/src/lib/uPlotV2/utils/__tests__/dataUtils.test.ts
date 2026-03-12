import uPlot from 'uplot';

import {
	applySpanGapsToAlignedData,
	isInvalidPlotValue,
	normalizePlotValue,
	SeriesSpanGapsOption,
} from '../dataUtils';

describe('dataUtils', () => {
	describe('isInvalidPlotValue', () => {
		it('treats null and undefined as invalid', () => {
			expect(isInvalidPlotValue(null)).toBe(true);
			expect(isInvalidPlotValue(undefined)).toBe(true);
		});

		it('treats finite numbers as valid and non-finite as invalid', () => {
			expect(isInvalidPlotValue(0)).toBe(false);
			expect(isInvalidPlotValue(123.45)).toBe(false);
			expect(isInvalidPlotValue(Number.NaN)).toBe(true);
			expect(isInvalidPlotValue(Infinity)).toBe(true);
			expect(isInvalidPlotValue(-Infinity)).toBe(true);
		});

		it('treats well-formed numeric strings as valid', () => {
			expect(isInvalidPlotValue('0')).toBe(false);
			expect(isInvalidPlotValue('123.45')).toBe(false);
			expect(isInvalidPlotValue('-1')).toBe(false);
		});

		it('treats Infinity/NaN string variants and non-numeric strings as invalid', () => {
			expect(isInvalidPlotValue('+Inf')).toBe(true);
			expect(isInvalidPlotValue('-Inf')).toBe(true);
			expect(isInvalidPlotValue('Infinity')).toBe(true);
			expect(isInvalidPlotValue('-Infinity')).toBe(true);
			expect(isInvalidPlotValue('NaN')).toBe(true);
			expect(isInvalidPlotValue('not-a-number')).toBe(true);
		});

		it('treats non-number, non-string values as valid (left to caller)', () => {
			expect(isInvalidPlotValue({})).toBe(false);
			expect(isInvalidPlotValue([])).toBe(false);
			expect(isInvalidPlotValue(true)).toBe(false);
		});
	});

	describe('normalizePlotValue', () => {
		it('returns null for invalid values detected by isInvalidPlotValue', () => {
			expect(normalizePlotValue(null)).toBeNull();
			expect(normalizePlotValue(undefined)).toBeNull();
			expect(normalizePlotValue(NaN)).toBeNull();
			expect(normalizePlotValue(Infinity)).toBeNull();
			expect(normalizePlotValue('-Infinity')).toBeNull();
			expect(normalizePlotValue('not-a-number')).toBeNull();
		});

		it('parses valid numeric strings into numbers', () => {
			expect(normalizePlotValue('0')).toBe(0);
			expect(normalizePlotValue('123.45')).toBe(123.45);
			expect(normalizePlotValue('-1')).toBe(-1);
		});

		it('passes through valid numbers unchanged', () => {
			expect(normalizePlotValue(0)).toBe(0);
			expect(normalizePlotValue(123)).toBe(123);
			expect(normalizePlotValue(42.5)).toBe(42.5);
		});
	});

	describe('applyspanGapsToAlignedData', () => {
		const xs: uPlot.AlignedData[0] = [0, 10, 20, 30];

		it('returns original data when there are no series', () => {
			const data: uPlot.AlignedData = [xs];
			const result = applySpanGapsToAlignedData(data, []);

			expect(result).toBe(data);
		});

		it('leaves data unchanged when spanGaps is undefined', () => {
			const ys = [1, null, 2, null];
			const data: uPlot.AlignedData = [xs, ys];
			const options: SeriesSpanGapsOption[] = [{}];

			const result = applySpanGapsToAlignedData(data, options);

			expect(result[1]).toEqual(ys);
		});

		it('converts nulls to undefined when spanGaps is true', () => {
			const ys = [1, null, 2, null];
			const data: uPlot.AlignedData = [xs, ys];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: true }];

			const result = applySpanGapsToAlignedData(data, options);

			expect(result[1]).toEqual([1, undefined, 2, undefined]);
		});

		it('leaves data unchanged when spanGaps is false', () => {
			const ys = [1, null, 2, null];
			const data: uPlot.AlignedData = [xs, ys];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: false }];

			const result = applySpanGapsToAlignedData(data, options);

			expect(result[1]).toEqual(ys);
		});

		it('runs threshold-based null handling when spanGaps is numeric', () => {
			const ys = [1, null, null, 2];
			const data: uPlot.AlignedData = [xs, ys];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 25 }];

			const result = applySpanGapsToAlignedData(data, options);

			// gap between x=0 and x=30 is 30, so with threshold 25 it should stay null
			expect(result[1]).toEqual([1, null, null, 2]);
		});
	});
});
