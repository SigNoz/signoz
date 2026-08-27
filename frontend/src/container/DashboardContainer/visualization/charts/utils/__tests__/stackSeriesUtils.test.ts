import { AlignedData } from 'uplot';

import { StackMode } from 'lib/uPlotV2/config/types';

import { stackSeries } from '../stackSeriesUtils';

const includeAll = (): boolean => false;

// Stacking is top-down: the first series carries the column total, the last its own
// raw value. Every expectation below reads in that order.
describe('stackSeries', () => {
	it('is a no-op under `none`, returning the data and no bands', () => {
		const data: AlignedData = [[1], [30], [10]];

		const { data: result, bands } = stackSeries(data, includeAll, StackMode.None);

		expect(result).toBe(data);
		expect(bands).toStrictEqual([]);
	});

	describe('normal', () => {
		it('accumulates raw values from the bottom series upward', () => {
			const data: AlignedData = [
				[1, 2],
				[10, 20],
				[1, 2],
			];

			expect(stackSeries(data, includeAll, StackMode.Normal).data).toStrictEqual([
				[1, 2],
				[11, 22],
				[1, 2],
			]);
		});

		it('treats nulls as 0 without breaking the running total', () => {
			const data: AlignedData = [
				[1, 2],
				[10, null],
				[1, 2],
			];

			expect(stackSeries(data, includeAll, StackMode.Normal).data).toStrictEqual([
				[1, 2],
				[11, 2],
				[1, 2],
			]);
		});

		it('emits one band per adjacent pair of participating series', () => {
			const data: AlignedData = [[1], [10], [5], [1]];

			expect(stackSeries(data, includeAll, StackMode.Normal).bands).toStrictEqual([
				{ series: [1, 2] },
				{ series: [2, 3] },
			]);
		});

		it('copies omitted series through unstacked and skips their bands', () => {
			const data: AlignedData = [[1], [10], [5], [1]];
			const omitMiddle = (seriesIndex: number): boolean => seriesIndex === 2;

			const { data: stacked, bands } = stackSeries(
				data,
				omitMiddle,
				StackMode.Normal,
			);

			expect(stacked).toStrictEqual([[1], [11], [5], [1]]);
			expect(bands).toStrictEqual([{ series: [1, 3] }]);
		});
	});

	describe('percent', () => {
		it('rescales each column to its total so the top series reads 100', () => {
			const data: AlignedData = [
				[1, 2],
				[30, 10],
				[10, 10],
			];

			expect(stackSeries(data, includeAll, StackMode.Percent).data).toStrictEqual([
				[1, 2],
				[100, 100],
				[25, 50],
			]);
		});

		it('normalises per column, so an identical series differs across x', () => {
			const data: AlignedData = [
				[1, 2],
				[1, 3],
				[1, 1],
			];

			expect(stackSeries(data, includeAll, StackMode.Percent).data).toStrictEqual([
				[1, 2],
				[100, 100],
				[50, 25],
			]);
		});

		it('excludes omitted series from the total, so the visible ones still reach 100', () => {
			const data: AlignedData = [[1], [30], [10], [60]];
			const omitLast = (seriesIndex: number): boolean => seriesIndex === 3;

			expect(stackSeries(data, omitLast, StackMode.Percent).data).toStrictEqual([
				[1],
				[100],
				[25],
				[60],
			]);
		});

		it('yields 0 for a column whose participating series sum to zero', () => {
			const data: AlignedData = [
				[1, 2],
				[0, 5],
				[0, 5],
			];

			expect(stackSeries(data, includeAll, StackMode.Percent).data).toStrictEqual([
				[1, 2],
				[0, 100],
				[0, 50],
			]);
		});

		it('divides by the signed total when a column mixes signs', () => {
			// 30 + (-10) = 20, so the shares are 150% and -50% and still sum to 100.
			const data: AlignedData = [[1], [30], [-10]];

			expect(stackSeries(data, includeAll, StackMode.Percent).data).toStrictEqual([
				[1],
				[100],
				[-50],
			]);
		});

		it('yields 0 across a column whose signed total cancels to zero', () => {
			const data: AlignedData = [[1], [10], [-10]];

			expect(stackSeries(data, includeAll, StackMode.Percent).data).toStrictEqual([
				[1],
				[0],
				[0],
			]);
		});
	});

	it('defaults to normal when no mode is given', () => {
		const data: AlignedData = [[1], [30], [10]];

		expect(stackSeries(data, includeAll).data).toStrictEqual(
			stackSeries(data, includeAll, StackMode.Normal).data,
		);
	});
});
