import { QueryData } from 'types/api/widgets/getQuery';

import { getSortedSeriesData } from '../getSortedSeriesData';

describe('getSortedSeriesData', () => {
	it('should return an empty array when input is undefined or empty', () => {
		expect(getSortedSeriesData(undefined)).toStrictEqual([]);
		expect(getSortedSeriesData([])).toStrictEqual([]);
	});

	it('should return a single series without modification', () => {
		const single: QueryData = {
			queryName: 'A',
			metric: {},
			values: [
				[100, '10'],
				[200, '20'],
			],
		};
		expect(getSortedSeriesData([single])).toStrictEqual([single]);
	});

	it('should not mutate the input array', () => {
		const seriesA: QueryData = {
			queryName: 'A',
			metric: {},
			values: [[100, '10']],
		};
		const seriesB: QueryData = {
			queryName: 'B',
			metric: {},
			values: [[100, '50']],
		};
		const input = [seriesA, seriesB];
		const inputSnapshot = [...input];

		const result = getSortedSeriesData(input);

		expect(result).toStrictEqual([seriesB, seriesA]);
		// Original array must NOT be mutated in-place
		expect(input).toStrictEqual(inputSnapshot);
		expect(result).not.toBe(input);
	});

	it('should sort series in descending order of average values', () => {
		const seriesLow: QueryData = {
			queryName: 'low',
			metric: {},
			values: [
				[100, '10'],
				[200, '20'],
			], // avg = 15
		};
		const seriesMid: QueryData = {
			queryName: 'mid',
			metric: {},
			values: [
				[100, '25'],
				[200, '35'],
			], // avg = 30
		};
		const seriesHigh: QueryData = {
			queryName: 'high',
			metric: {},
			values: [
				[100, '100'],
				[200, '100'],
			], // avg = 100
		};

		const sorted = getSortedSeriesData([seriesLow, seriesHigh, seriesMid]);
		expect(sorted).toStrictEqual([seriesHigh, seriesMid, seriesLow]);
	});

	it('should handle series with empty values placing them at the end', () => {
		const seriesEmpty1: QueryData = {
			queryName: 'empty1',
			metric: {},
			values: [],
		};
		const seriesEmpty2: QueryData = {
			queryName: 'empty2',
			metric: {},
			values: [],
		};
		const seriesValid: QueryData = {
			queryName: 'valid',
			metric: {},
			values: [[100, '15']],
		};

		const sorted = getSortedSeriesData([seriesEmpty1, seriesValid, seriesEmpty2]);
		expect(sorted[0]).toBe(seriesValid);
		expect(sorted.slice(1)).toStrictEqual(
			expect.arrayContaining([seriesEmpty1, seriesEmpty2]),
		);
	});

	it('should not throw when a series has undefined or missing values', () => {
		const seriesMissingValues = {
			queryName: 'missing',
			metric: {},
		} as unknown as QueryData;
		const seriesValid: QueryData = {
			queryName: 'valid',
			metric: {},
			values: [[100, '50']],
		};

		expect(() =>
			getSortedSeriesData([seriesMissingValues, seriesValid]),
		).not.toThrow();
		const sorted = getSortedSeriesData([seriesMissingValues, seriesValid]);
		expect(sorted[0]).toBe(seriesValid);
		expect(sorted[1]).toBe(seriesMissingValues);
	});

	it('should handle non-numeric and NaN values without corrupting sorting', () => {
		const seriesWithNaN: QueryData = {
			queryName: 'nan',
			metric: {},
			values: [
				[100, 'NaN'],
				[200, '40'],
			], // valid avg = 40
		};
		const seriesNormal: QueryData = {
			queryName: 'normal',
			metric: {},
			values: [
				[100, '20'],
				[200, '20'],
			], // avg = 20
		};

		const sorted = getSortedSeriesData([seriesNormal, seriesWithNaN]);
		expect(sorted[0]).toBe(seriesWithNaN);
		expect(sorted[1]).toBe(seriesNormal);
	});
});
