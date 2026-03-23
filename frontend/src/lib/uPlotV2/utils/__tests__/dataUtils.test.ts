import uPlot from 'uplot';

import {
	applySpanGapsToAlignedData,
	insertLargeGapNullsIntoAlignedData,
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

	describe('insertLargeGapNullsIntoAlignedData', () => {
		it('returns original data unchanged when no gap exceeds the threshold', () => {
			// all gaps = 10, threshold = 25 → no insertions
			const data: uPlot.AlignedData = [
				[0, 10, 20, 30],
				[1, 2, 3, 4],
			];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 25 }];

			const result = insertLargeGapNullsIntoAlignedData(data, options);

			expect(result).toBe(data);
		});

		it('does not insert when the gap equals the threshold exactly', () => {
			// gap = 50, threshold = 50 → condition is gap > threshold, not >=
			const data: uPlot.AlignedData = [
				[0, 50],
				[1, 2],
			];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 50 }];

			const result = insertLargeGapNullsIntoAlignedData(data, options);

			expect(result).toBe(data);
		});

		it('inserts a null at the midpoint when a single gap exceeds the threshold', () => {
			// gap 0→100 = 100 > 50 → insert null at x=50
			const data: uPlot.AlignedData = [
				[0, 100],
				[1, 2],
			];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 50 }];

			const result = insertLargeGapNullsIntoAlignedData(data, options);

			expect(result[0]).toEqual([0, 50, 100]);
			expect(result[1]).toEqual([1, null, 2]);
		});

		it('inserts nulls at every gap that exceeds the threshold', () => {
			// gaps: 0→100=100, 100→110=10, 110→210=100; threshold=50
			// → insert at 0→100 and 110→210
			const data: uPlot.AlignedData = [
				[0, 100, 110, 210],
				[1, 2, 3, 4],
			];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 50 }];

			const result = insertLargeGapNullsIntoAlignedData(data, options);

			expect(result[0]).toEqual([0, 50, 100, 110, 160, 210]);
			expect(result[1]).toEqual([1, null, 2, 3, null, 4]);
		});

		it('inserts null for all series at a gap triggered by any one series', () => {
			// series 0: threshold=50, gap=100 → triggers insertion
			// series 1: threshold=200, gap=100 → would not trigger alone
			// result: both series get null at the inserted x because the x-axis is shared
			const data: uPlot.AlignedData = [
				[0, 100],
				[1, 2],
				[3, 4],
			];
			const options: SeriesSpanGapsOption[] = [
				{ spanGaps: 50 },
				{ spanGaps: 200 },
			];

			const result = insertLargeGapNullsIntoAlignedData(data, options);

			expect(result[0]).toEqual([0, 50, 100]);
			expect(result[1]).toEqual([1, null, 2]);
			expect(result[2]).toEqual([3, null, 4]);
		});

		it('ignores boolean spanGaps options (only numeric values trigger insertion)', () => {
			const data: uPlot.AlignedData = [
				[0, 100],
				[1, 2],
			];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: true }];

			const result = insertLargeGapNullsIntoAlignedData(data, options);

			expect(result).toBe(data);
		});

		it('returns original data when series options array is empty', () => {
			const data: uPlot.AlignedData = [
				[0, 100],
				[1, 2],
			];

			const result = insertLargeGapNullsIntoAlignedData(data, []);

			expect(result).toBe(data);
		});

		it('returns original data when there is only one x point', () => {
			const data: uPlot.AlignedData = [[0], [1]];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 10 }];

			const result = insertLargeGapNullsIntoAlignedData(data, options);

			expect(result).toBe(data);
		});

		it('preserves existing null values in the series alongside inserted ones', () => {
			// original series already has a null; gap 0→100 also triggers insertion
			const data: uPlot.AlignedData = [
				[0, 100, 110],
				[1, null, 2],
			];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 50 }];

			const result = insertLargeGapNullsIntoAlignedData(data, options);

			expect(result[0]).toEqual([0, 50, 100, 110]);
			expect(result[1]).toEqual([1, null, null, 2]);
		});
	});

	describe('applySpanGapsToAlignedData', () => {
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

		it('inserts a null break point when a gap exceeds the numeric threshold', () => {
			// gap 0→100 = 100 > 50 → null inserted at midpoint x=50
			const data: uPlot.AlignedData = [
				[0, 100, 110],
				[1, 2, 3],
			];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 50 }];

			const result = applySpanGapsToAlignedData(data, options);

			expect(result[0]).toEqual([0, 50, 100, 110]);
			expect(result[1]).toEqual([1, null, 2, 3]);
		});

		it('returns original data when no gap exceeds the numeric threshold', () => {
			// all gaps = 10, threshold = 25 → no insertions
			const data: uPlot.AlignedData = [xs, [1, 2, 3, 4]];
			const options: SeriesSpanGapsOption[] = [{ spanGaps: 25 }];

			const result = applySpanGapsToAlignedData(data, options);

			expect(result).toBe(data);
		});

		it('applies both numeric gap insertion and boolean null-to-undefined in one pass', () => {
			// series 0: spanGaps: 50 → gap 0→100 triggers a null break at midpoint x=50
			// series 1: spanGaps: true → the inserted null at x=50 becomes undefined,
			//   so the line spans over it rather than breaking
			const data: uPlot.AlignedData = [
				[0, 100],
				[1, 2],
				[3, 4],
			];
			const options: SeriesSpanGapsOption[] = [
				{ spanGaps: 50 },
				{ spanGaps: true },
			];

			const result = applySpanGapsToAlignedData(data, options);

			// x-axis extended with the inserted midpoint
			expect(result[0]).toEqual([0, 50, 100]);
			// series 0: null at midpoint breaks the line
			expect(result[1]).toEqual([1, null, 2]);
			// series 1: null at midpoint converted to undefined → line spans over it
			expect(result[2]).toEqual([3, undefined, 4]);
		});
	});
});
