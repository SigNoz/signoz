import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import {
	computeRoundedMinMax,
	createCustomTimeRange,
	CUSTOM_TIME_SEPARATOR,
	getAutoRefreshQueryKey,
	isCustomTimeRange,
	NANO_SECOND_MULTIPLIER,
	parseCustomTimeRange,
	parseSelectedTime,
	roundDownToMinute,
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

	describe('roundDownToMinute', () => {
		it('should round down timestamp to minute boundary', () => {
			// 2024-01-15T12:30:45.123Z -> 2024-01-15T12:30:00.000Z
			const inputNano = 1705321845123 * NANO_SECOND_MULTIPLIER; // 12:30:45.123
			const expectedNano = 1705321800000 * NANO_SECOND_MULTIPLIER; // 12:30:00.000

			expect(roundDownToMinute(inputNano)).toBe(expectedNano);
		});

		it('should not change timestamp already at minute boundary', () => {
			const inputNano = 1705321800000 * NANO_SECOND_MULTIPLIER; // 12:30:00.000

			expect(roundDownToMinute(inputNano)).toBe(inputNano);
		});

		it('should handle timestamp at 59 seconds', () => {
			// 2024-01-15T12:30:59.999Z -> 2024-01-15T12:30:00.000Z
			const inputNano = 1705321859999 * NANO_SECOND_MULTIPLIER;
			const expectedNano = 1705321800000 * NANO_SECOND_MULTIPLIER;

			expect(roundDownToMinute(inputNano)).toBe(expectedNano);
		});
	});

	describe('computeRoundedMinMax', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2024-01-15T12:30:45.123Z'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should return rounded maxTime for relative time', () => {
			const result = computeRoundedMinMax('15m');

			// maxTime should be rounded down to 12:30:00.000
			const expectedMaxTime =
				new Date('2024-01-15T12:30:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;
			expect(result.maxTime).toBe(expectedMaxTime);
		});

		it('should compute minTime based on rounded maxTime', () => {
			const result = computeRoundedMinMax('15m');

			const expectedMaxTime =
				new Date('2024-01-15T12:30:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;
			const fifteenMinutesNs = 15 * 60 * 1000 * NANO_SECOND_MULTIPLIER;

			expect(result.minTime).toBe(expectedMaxTime - fifteenMinutesNs);
		});

		it('should return unchanged values for custom time range', () => {
			const minTime = 1000000000;
			const maxTime = 2000000000;
			const customTime = createCustomTimeRange(minTime, maxTime);

			const result = computeRoundedMinMax(customTime);

			expect(result.minTime).toBe(minTime);
			expect(result.maxTime).toBe(maxTime);
		});

		it('should return fallback for invalid custom time range', () => {
			jest.setSystemTime(new Date('2024-01-15T12:30:45.123Z'));

			const invalidCustom = `invalid${CUSTOM_TIME_SEPARATOR}values`;
			const result = computeRoundedMinMax(invalidCustom);

			const now = Date.now() * NANO_SECOND_MULTIPLIER;
			const fallbackDuration = 30 * 1000 * NANO_SECOND_MULTIPLIER;

			expect(result.maxTime).toBe(now);
			expect(result.minTime).toBe(now - fallbackDuration);
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
});
