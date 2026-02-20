import { PrecisionOptionsEnum } from 'components/Graph/types';

import {
	formatTableValueWithUnit,
	getDefaultTableDataSet,
	getTableColumnTitle,
} from '../utils';

describe('ChartManager utils', () => {
	describe('getDefaultTableDataSet', () => {
		const createOptions = (seriesCount: number): uPlot.Options => ({
			series: Array.from({ length: seriesCount }, (_, i) =>
				i === 0
					? { label: 'Time', value: 'time' }
					: { label: `Series ${i}`, scale: 'y' },
			),
			width: 100,
			height: 100,
		});

		it('returns one row per series with computed stats', () => {
			const options = createOptions(3);
			const data: uPlot.AlignedData = [
				[1000, 2000, 3000],
				[10, 20, 30],
				[1, 2, 3],
			];

			const result = getDefaultTableDataSet(options, data);

			expect(result).toHaveLength(3);
			expect(result[0]).toMatchObject({
				index: 0,
				label: 'Time',
				show: true,
			});
			expect(result[1]).toMatchObject({
				index: 1,
				label: 'Series 1',
				show: true,
				sum: 60,
				avg: 20,
				max: 30,
				min: 10,
			});
			expect(result[2]).toMatchObject({
				index: 2,
				label: 'Series 2',
				show: true,
				sum: 6,
				avg: 2,
				max: 3,
				min: 1,
			});
		});

		it('handles empty data arrays', () => {
			const options = createOptions(2);
			const data: uPlot.AlignedData = [[], []];

			const result = getDefaultTableDataSet(options, data);

			expect(result[0]).toMatchObject({
				sum: 0,
				avg: 0,
				max: 0,
				min: 0,
			});
		});

		it('respects decimalPrecision parameter', () => {
			const options = createOptions(2);
			const data: uPlot.AlignedData = [[1000], [123.454]];

			const resultTwo = getDefaultTableDataSet(
				options,
				data,
				PrecisionOptionsEnum.TWO,
			);
			expect(resultTwo[1].avg).toBe(123.45);

			const resultZero = getDefaultTableDataSet(
				options,
				data,
				PrecisionOptionsEnum.ZERO,
			);
			expect(resultZero[1].avg).toBe(123);
		});
	});

	describe('formatTableValueWithUnit', () => {
		it('formats value with unit', () => {
			const result = formatTableValueWithUnit(1234.56, 'ms');
			expect(result).toBe('1.23 s');
		});

		it('falls back to none format when yAxisUnit is undefined', () => {
			const result = formatTableValueWithUnit(123.45);
			expect(result).toBe('123.45');
		});
	});

	describe('getTableColumnTitle', () => {
		it('returns title only when yAxisUnit is undefined', () => {
			expect(getTableColumnTitle('Avg')).toBe('Avg');
		});

		it('returns title with unit when yAxisUnit is provided', () => {
			const result = getTableColumnTitle('Avg', 'ms');
			expect(result).toBe('Avg (in Milliseconds (ms))');
		});
	});
});
