import {
	buildDerivedStarts,
	computeBucketTotals,
	findCumulativeIndex,
	findNonZeroRange,
	focusHeatmap,
	formatBucketValue,
} from './utils';

describe('utils heatmap helpers', () => {
	describe('formatBucketValue', () => {
		it('formats small values in exponential notation', () => {
			expect(formatBucketValue(0.005)).toBe('5.00e-3');
			expect(formatBucketValue(-0.005)).toBe('-5.00e-3');
		});

		it('formats large values in exponential notation', () => {
			expect(formatBucketValue(2000000)).toBe('2.00e+6');
			expect(formatBucketValue(-2000000)).toBe('-2.00e+6');
		});

		it('formats normal values with 2 decimal places', () => {
			expect(formatBucketValue(123.456)).toBe('123.46');
			expect(formatBucketValue(0.5)).toBe('0.50');
			expect(formatBucketValue(0)).toBe('0.00');
		});
	});

	describe('buildDerivedStarts', () => {
		it('returns bucketStarts if length matches bucketEnds', () => {
			const ends = [10, 20, 30];
			const starts = [0, 10, 20];
			expect(buildDerivedStarts(ends, starts)).toBe(starts);
		});

		it('derives starts from prior ends if not provided or length mismatch', () => {
			const ends = [10, 20, 30];
			// First element 0, subsequent are previous bucket's end
			expect(buildDerivedStarts(ends, undefined)).toEqual([0, 10, 20]);
			expect(buildDerivedStarts(ends, [1])).toEqual([0, 10, 20]);
		});
	});

	describe('computeBucketTotals', () => {
		it('sums up values per bucket index across rows', () => {
			const counts = [
				[1, 2, 3],
				[4, 5, 6],
			];
			const bucketCount = 3;
			const expected = {
				bucketTotals: [5, 7, 9], // 1+4, 2+5, 3+6
				total: 21, // 1+2+3+4+5+6
			};
			expect(computeBucketTotals(counts, bucketCount)).toEqual(expected);
		});

		it('handles rows shorter than bucketCount', () => {
			const counts = [[1, 2]];
			const bucketCount = 3;
			const expected = {
				bucketTotals: [1, 2, 0],
				total: 3,
			};
			expect(computeBucketTotals(counts, bucketCount)).toEqual(expected);
		});

		it('ignores non-finite or non-positive values', () => {
			const counts = [
				[1, -1, NaN, Infinity],
				[1, 0, 2, 3],
			];
			const bucketCount = 4;
			const expected = {
				bucketTotals: [2, 0, 2, 3],
				total: 7, // 1+1+2+3
			};
			expect(computeBucketTotals(counts, bucketCount)).toEqual(expected);
		});
	});

	describe('findCumulativeIndex', () => {
		const totals = [10, 20, 30, 40]; // Cumulative: 10, 30, 60, 100

		it('finds index where cumulative sum >= target', () => {
			expect(findCumulativeIndex(totals, 5)).toBe(0); // 10 >= 5
			expect(findCumulativeIndex(totals, 10)).toBe(0); // 10 >= 10
			expect(findCumulativeIndex(totals, 11)).toBe(1); // 30 >= 11
			expect(findCumulativeIndex(totals, 30)).toBe(1); // 30 >= 30
			expect(findCumulativeIndex(totals, 31)).toBe(2); // 60 >= 31
		});

		it('returns last index if target > total sum', () => {
			expect(findCumulativeIndex(totals, 200)).toBe(3);
		});
	});

	describe('findNonZeroRange', () => {
		it('finds min and max indices of non-zero buckets', () => {
			// Indices: 0  1  2  3  4
			const totals = [0, 5, 0, 3, 0];
			expect(findNonZeroRange(totals)).toEqual({ minIdx: 1, maxIdx: 3 });
		});

		it('returns default range for all zeros', () => {
			const totals = [0, 0, 0];
			expect(findNonZeroRange(totals)).toEqual({ minIdx: 0, maxIdx: 2 });
		});
	});

	describe('focusHeatmap', () => {
		const bucketEnds = [10, 20, 30, 40, 50];

		it('returns full range if total is 0', () => {
			const counts = [
				[0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0],
			];
			const result = focusHeatmap(bucketEnds, undefined, counts);
			expect(result.bucketEnds.length).toBe(5);
			expect(result.derivedStarts[0]).toBe(0);
			expect(result.minY).toBe(0);
			expect(result.maxY).toBe(50);
		});

		it('focuses on relevant percentile range', () => {
			const counts = [[1, 1, 1000, 1, 1]];
			const result = focusHeatmap(bucketEnds, undefined, counts);
			expect(result.bucketEnds.length).toBe(5);
		});

		it('trims outliers correctly', () => {
			const counts = [[1, 1, 5000, 4998, 0]];
			const result = focusHeatmap(bucketEnds, undefined, counts);
			expect(result.bucketEnds).toEqual([20, 30, 40, 50]);
			expect(result.derivedStarts).toEqual([10, 20, 30, 40]);
			expect(result.maxY).toBe(40);
			expect(result.minY).toBe(10);
		});
	});
});
