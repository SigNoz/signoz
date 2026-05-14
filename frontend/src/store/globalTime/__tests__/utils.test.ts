import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import {
	computeRounded5sMinMax,
	createCustomTimeRange,
	CUSTOM_TIME_SEPARATOR,
	getAutoRefreshQueryKey,
	isCustomTimeRange,
	NANO_SECOND_MULTIPLIER,
	parseCustomTimeRange,
	parseSelectedTime,
	roundDownTo5Seconds,
} from '../utils';

describe('globalTime/utils', () => {
	describe('CUSTOM_TIME_SEPARATOR', () => {
		it('should be defined as ||_||', () => {
			expect(CUSTOM_TIME_SEPARATOR).toBe('||_||');
		});
	});

	describe('isCustomTimeRange', () => {
		it('should return true for custom time range strings', () => {
			expect(isCustomTimeRange('1000000000||_||2000000000')).toBe(true);
			expect(isCustomTimeRange('0||_||0')).toBe(true);
		});

		it('should return false for relative time strings', () => {
			expect(isCustomTimeRange('15m')).toBe(false);
			expect(isCustomTimeRange('1h')).toBe(false);
			expect(isCustomTimeRange('1d')).toBe(false);
			expect(isCustomTimeRange('30s')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isCustomTimeRange('')).toBe(false);
		});
	});

	describe('createCustomTimeRange', () => {
		it('should create a custom time range string from min and max times', () => {
			const minTime = 1000000000;
			const maxTime = 2000000000;
			const result = createCustomTimeRange(minTime, maxTime);
			expect(result).toBe(`${minTime}${CUSTOM_TIME_SEPARATOR}${maxTime}`);
		});

		it('should handle zero values', () => {
			const result = createCustomTimeRange(0, 0);
			expect(result).toBe(`0${CUSTOM_TIME_SEPARATOR}0`);
		});

		it('should handle large nanosecond timestamps', () => {
			const minTime = 1700000000000000000;
			const maxTime = 1700000001000000000;
			const result = createCustomTimeRange(minTime, maxTime);
			expect(result).toBe(`${minTime}${CUSTOM_TIME_SEPARATOR}${maxTime}`);
		});
	});

	describe('parseCustomTimeRange', () => {
		it('should parse a valid custom time range string', () => {
			const minTime = 1000000000;
			const maxTime = 2000000000;
			const timeString = `${minTime}${CUSTOM_TIME_SEPARATOR}${maxTime}`;
			const result = parseCustomTimeRange(timeString);
			expect(result).toStrictEqual({ minTime, maxTime });
		});

		it('should return null for non-custom time range strings', () => {
			expect(parseCustomTimeRange('15m')).toBeNull();
			expect(parseCustomTimeRange('1h')).toBeNull();
		});

		it('should return null for invalid numeric values', () => {
			expect(parseCustomTimeRange(`abc${CUSTOM_TIME_SEPARATOR}def`)).toBeNull();
			expect(parseCustomTimeRange(`123${CUSTOM_TIME_SEPARATOR}def`)).toBeNull();
			expect(parseCustomTimeRange(`abc${CUSTOM_TIME_SEPARATOR}456`)).toBeNull();
		});

		it('should handle zero values', () => {
			const result = parseCustomTimeRange(`0${CUSTOM_TIME_SEPARATOR}0`);
			expect(result).toStrictEqual({ minTime: 0, maxTime: 0 });
		});
	});

	describe('parseSelectedTime', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should parse custom time range and return min/max values', () => {
			const minTime = 1000000000;
			const maxTime = 2000000000;
			const timeString = createCustomTimeRange(minTime, maxTime);
			const result = parseSelectedTime(timeString);
			expect(result).toStrictEqual({ minTime, maxTime });
		});

		it('should return fallback for invalid custom time range', () => {
			const invalidCustom = `invalid${CUSTOM_TIME_SEPARATOR}values`;
			const result = parseSelectedTime(invalidCustom);
			const now = Date.now() * NANO_SECOND_MULTIPLIER;
			const fallbackDuration = 30 * 1000 * NANO_SECOND_MULTIPLIER; // 30s in nanoseconds
			expect(result.maxTime).toBe(now);
			expect(result.minTime).toBe(now - fallbackDuration);
		});

		it('should parse relative time strings using getMinMaxForSelectedTime', () => {
			const result = parseSelectedTime('15m');
			const now = Date.now() * NANO_SECOND_MULTIPLIER;
			// 15 minutes in nanoseconds
			const fifteenMinutesNs = 15 * 60 * 1000 * NANO_SECOND_MULTIPLIER;

			expect(result.maxTime).toBe(now);
			expect(result.minTime).toBe(now - fifteenMinutesNs);
		});

		it('should parse 1h relative time', () => {
			const result = parseSelectedTime('1h');
			const now = Date.now() * NANO_SECOND_MULTIPLIER;
			// 1 hour in nanoseconds
			const oneHourNs = 60 * 60 * 1000 * NANO_SECOND_MULTIPLIER;

			expect(result.maxTime).toBe(now);
			expect(result.minTime).toBe(now - oneHourNs);
		});

		it('should parse 1d relative time', () => {
			const result = parseSelectedTime('1d');
			const now = Date.now() * NANO_SECOND_MULTIPLIER;
			// 1 day in nanoseconds
			const oneDayNs = 24 * 60 * 60 * 1000 * NANO_SECOND_MULTIPLIER;

			expect(result.maxTime).toBe(now);
			expect(result.minTime).toBe(now - oneDayNs);
		});
	});

	describe('roundDownTo5Seconds', () => {
		it('should round down timestamp to 5-second boundary', () => {
			// 12:30:47.123Z -> 12:30:45.000Z
			const inputNano = 1705321847123 * NANO_SECOND_MULTIPLIER;
			const expectedNano = 1705321845000 * NANO_SECOND_MULTIPLIER;

			expect(roundDownTo5Seconds(inputNano)).toBe(expectedNano);
		});

		it('should not change timestamp already at 5-second boundary', () => {
			const inputNano = 1705321845000 * NANO_SECOND_MULTIPLIER; // 12:30:45.000

			expect(roundDownTo5Seconds(inputNano)).toBe(inputNano);
		});

		it('should round 12:30:04.999 down to 12:30:00.000', () => {
			const inputNano = 1705321804999 * NANO_SECOND_MULTIPLIER;
			const expectedNano = 1705321800000 * NANO_SECOND_MULTIPLIER;

			expect(roundDownTo5Seconds(inputNano)).toBe(expectedNano);
		});

		it('should round 12:30:09.999 down to 12:30:05.000', () => {
			const inputNano = 1705321809999 * NANO_SECOND_MULTIPLIER;
			const expectedNano = 1705321805000 * NANO_SECOND_MULTIPLIER;

			expect(roundDownTo5Seconds(inputNano)).toBe(expectedNano);
		});

		it('should handle timestamp at exact 5-second intervals', () => {
			// Test 5, 10, 15, 20, 25... second marks
			const base = 1705321800000; // 12:30:00
			for (let sec = 0; sec < 60; sec += 5) {
				const inputNano = (base + sec * 1000) * NANO_SECOND_MULTIPLIER;
				expect(roundDownTo5Seconds(inputNano)).toBe(inputNano);
			}
		});
	});

	describe('computeRounded5sMinMax', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2024-01-15T12:30:47.123Z'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should return maxTime rounded to 5-second boundary for relative time', () => {
			const result = computeRounded5sMinMax('15m');

			// maxTime should be rounded down to 12:30:45.000
			const expectedMaxTime =
				new Date('2024-01-15T12:30:45.000Z').getTime() * NANO_SECOND_MULTIPLIER;
			expect(result.maxTime).toBe(expectedMaxTime);
		});

		it('should compute minTime based on 5s-rounded maxTime', () => {
			const result = computeRounded5sMinMax('15m');

			const expectedMaxTime =
				new Date('2024-01-15T12:30:45.000Z').getTime() * NANO_SECOND_MULTIPLIER;
			const fifteenMinutesNs = 15 * 60 * 1000 * NANO_SECOND_MULTIPLIER;

			expect(result.minTime).toBe(expectedMaxTime - fifteenMinutesNs);
		});

		it('should return unchanged values for custom time range', () => {
			const minTime = 1000000000;
			const maxTime = 2000000000;
			const customTime = createCustomTimeRange(minTime, maxTime);

			const result = computeRounded5sMinMax(customTime);

			expect(result.minTime).toBe(minTime);
			expect(result.maxTime).toBe(maxTime);
		});

		it('should preserve duration for 1h relative time', () => {
			const result = computeRounded5sMinMax('1h');

			const oneHourNs = 60 * 60 * 1000 * NANO_SECOND_MULTIPLIER;
			const duration = result.maxTime - result.minTime;

			expect(duration).toBe(oneHourNs);
		});
	});

	describe('getAutoRefreshQueryKey', () => {
		it('should prefix with AUTO_REFRESH_QUERY constant', () => {
			const result = getAutoRefreshQueryKey('15m', 'MY_QUERY');

			expect(result[0]).toBe(REACT_QUERY_KEY.AUTO_REFRESH_QUERY);
		});

		it('should append selectedTime at end', () => {
			const result = getAutoRefreshQueryKey('15m', 'MY_QUERY', 'param1');

			expect(result).toStrictEqual([
				REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
				'MY_QUERY',
				'param1',
				'15m',
			]);
		});

		it('should handle no additional query parts', () => {
			const result = getAutoRefreshQueryKey('1h');

			expect(result).toStrictEqual([REACT_QUERY_KEY.AUTO_REFRESH_QUERY, '1h']);
		});

		it('should handle custom time range as selectedTime', () => {
			const customTime = createCustomTimeRange(1000000000, 2000000000);
			const result = getAutoRefreshQueryKey(customTime, 'METRICS');

			expect(result).toStrictEqual([
				REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
				'METRICS',
				customTime,
			]);
		});

		it('should handle object query parts', () => {
			const params = { entityId: '123', filter: 'active' };
			const result = getAutoRefreshQueryKey('15m', 'ENTITY', params);

			expect(result).toStrictEqual([
				REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
				'ENTITY',
				params,
				'15m',
			]);
		});
	});

	describe('getAutoRefreshQueryKey deprecation', () => {
		const originalEnv = process.env.NODE_ENV;
		const originalWarn = console.warn;

		beforeEach(() => {
			console.warn = jest.fn();
		});

		afterEach(() => {
			process.env.NODE_ENV = originalEnv;
			console.warn = originalWarn;
		});

		it('should log deprecation warning in development', () => {
			process.env.NODE_ENV = 'development';

			getAutoRefreshQueryKey('15m', 'TEST');

			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining('deprecated'),
			);
		});

		it('should NOT log deprecation warning in production', () => {
			process.env.NODE_ENV = 'production';

			getAutoRefreshQueryKey('15m', 'TEST');

			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should still return correct query key format', () => {
			const result = getAutoRefreshQueryKey('15m', 'MY_QUERY', 'param1');

			expect(result).toStrictEqual([
				REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
				'MY_QUERY',
				'param1',
				'15m',
			]);
		});
	});
});
