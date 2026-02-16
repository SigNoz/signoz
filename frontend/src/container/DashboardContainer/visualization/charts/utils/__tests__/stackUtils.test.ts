import { AlignedData } from 'uplot';

import { getInitialStackedBands, stack } from '../stackUtils';

describe('stackUtils', () => {
	describe('stack', () => {
		const neverOmit = (): boolean => false;

		it('preserves time axis as first row', () => {
			const data: AlignedData = [
				[100, 200, 300],
				[1, 2, 3],
				[4, 5, 6],
			];
			const { data: result } = stack(data, neverOmit);
			expect(result[0]).toEqual([100, 200, 300]);
		});

		it('stacks value series cumulatively (last = raw, first = total)', () => {
			// Time, then 3 value series. Stack order: last series stays raw, then we add upward.
			const data: AlignedData = [
				[0, 1, 2],
				[1, 2, 3], // series 1
				[4, 5, 6], // series 2
				[7, 8, 9], // series 3
			];
			const { data: result } = stack(data, neverOmit);
			// result[1] = s1+s2+s3, result[2] = s2+s3, result[3] = s3
			expect(result[1]).toEqual([12, 15, 18]); // 1+4+7, 2+5+8, 3+6+9
			expect(result[2]).toEqual([11, 13, 15]); // 4+7, 5+8, 6+9
			expect(result[3]).toEqual([7, 8, 9]);
		});

		it('treats null values as 0 when stacking', () => {
			const data: AlignedData = [
				[0, 1],
				[1, null],
				[null, 10],
			];
			const { data: result } = stack(data, neverOmit);
			expect(result[1]).toEqual([1, 10]); // total
			expect(result[2]).toEqual([0, 10]); // last series with null→0
		});

		it('copies omitted series as-is without accumulating', () => {
			// Omit series 2 (index 2); series 1 and 3 are stacked.
			const data: AlignedData = [
				[0, 1],
				[10, 20], // series 1
				[100, 200], // series 2 - omitted
				[1, 2], // series 3
			];
			const omitSeries2 = (i: number): boolean => i === 2;
			const { data: result } = stack(data, omitSeries2);
			// series 3 raw: [1, 2]; series 2 omitted: [100, 200] as-is; series 1 stacked with s3: [11, 22]
			expect(result[1]).toEqual([11, 22]); // 10+1, 20+2
			expect(result[2]).toEqual([100, 200]); // copied, not stacked
			expect(result[3]).toEqual([1, 2]);
		});

		it('returns bands between consecutive visible series when none omitted', () => {
			const data: AlignedData = [
				[0, 1],
				[1, 2],
				[3, 4],
				[5, 6],
			];
			const { bands } = stack(data, neverOmit);
			expect(bands).toEqual([{ series: [1, 2] }, { series: [2, 3] }]);
		});

		it('returns bands only between visible series when some are omitted', () => {
			// 4 value series; omit index 2. Visible: 1, 3, 4. Bands: [1,3], [3,4]
			const data: AlignedData = [[0], [1], [2], [3], [4]];
			const omitSeries2 = (i: number): boolean => i === 2;
			const { bands } = stack(data, omitSeries2);
			expect(bands).toEqual([{ series: [1, 3] }, { series: [3, 4] }]);
		});

		it('returns empty bands when only one value series', () => {
			const data: AlignedData = [
				[0, 1],
				[1, 2],
			];
			const { bands } = stack(data, neverOmit);
			expect(bands).toEqual([]);
		});
	});

	describe('getInitialStackedBands', () => {
		it('returns one band between each consecutive pair for seriesCount 3', () => {
			expect(getInitialStackedBands(3)).toEqual([
				{ series: [1, 2] },
				{ series: [2, 3] },
			]);
		});

		it('returns empty array for seriesCount 0 or 1', () => {
			expect(getInitialStackedBands(0)).toEqual([]);
			expect(getInitialStackedBands(1)).toEqual([]);
		});

		it('returns single band for seriesCount 2', () => {
			expect(getInitialStackedBands(2)).toEqual([{ series: [1, 2] }]);
		});

		it('returns bands [1,2], [2,3], ..., [n-1, n] for seriesCount n', () => {
			const bands = getInitialStackedBands(5);
			expect(bands).toEqual([
				{ series: [1, 2] },
				{ series: [2, 3] },
				{ series: [3, 4] },
				{ series: [4, 5] },
			]);
		});
	});
});
