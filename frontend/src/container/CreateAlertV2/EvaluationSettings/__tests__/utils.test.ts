/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable import/first */

// Mock dayjs before importing any other modules
const MOCK_DATE_STRING = '2024-01-15T00:30:00Z';
const MOCK_DATE_STRING_NON_LEAP_YEAR = '2023-01-15T00:30:00Z';
const MOCK_DATE_STRING_SPANS_MONTHS = '2024-01-31T00:30:00Z';
const FREQ_DAILY = 'FREQ=DAILY';
const TEN_THIRTY_TIME = '10:30:00';
const NINE_AM_TIME = '09:00:00';
jest.mock('dayjs', () => {
	const originalDayjs = jest.requireActual('dayjs');
	const mockDayjs = jest.fn((date?: string | Date) => {
		if (date) {
			return originalDayjs(date);
		}
		return originalDayjs(MOCK_DATE_STRING);
	});
	Object.keys(originalDayjs).forEach((key) => {
		((mockDayjs as unknown) as Record<string, unknown>)[key] = originalDayjs[key];
	});
	return mockDayjs;
});

import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { EvaluationWindowState } from 'container/CreateAlertV2/context/types';
import dayjs, { Dayjs } from 'dayjs';
import { rrulestr } from 'rrule';

import { RollingWindowTimeframes } from '../types';
import {
	buildAlertScheduleFromCustomSchedule,
	buildAlertScheduleFromRRule,
	getCumulativeWindowTimeframeText,
	getCustomRollingWindowTimeframeText,
	getEvaluationWindowTypeText,
	getRollingWindowTimeframeText,
	getTimeframeText,
	isValidRRule,
} from '../utils';

jest.mock('rrule', () => ({
	rrulestr: jest.fn(),
}));

jest.mock('components/CustomTimePicker/timezoneUtils', () => ({
	generateTimezoneData: jest.fn().mockReturnValue([
		{ name: 'UTC', value: 'UTC', offset: '+00:00' },
		{ name: 'America/New_York', value: 'America/New_York', offset: '-05:00' },
		{ name: 'Europe/London', value: 'Europe/London', offset: '+00:00' },
	]),
}));

const mockEvaluationWindowState: EvaluationWindowState = {
	windowType: 'rolling',
	timeframe: '5m0s',
	startingAt: {
		number: '0',
		timezone: 'UTC',
		time: '00:00:00',
		unit: UniversalYAxisUnit.MINUTES,
	},
};

const formatDate = (date: Date): string =>
	dayjs(date).format('DD-MM-YYYY HH:mm:ss');

describe('utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getEvaluationWindowTypeText', () => {
		it('should return correct text for rolling window', () => {
			expect(getEvaluationWindowTypeText('rolling')).toBe('Rolling');
		});

		it('should return correct text for cumulative window', () => {
			expect(getEvaluationWindowTypeText('cumulative')).toBe('Cumulative');
		});

		it('should default to empty string for unknown type', () => {
			expect(
				getEvaluationWindowTypeText('unknown' as 'rolling' | 'cumulative'),
			).toBe('');
		});
	});

	describe('getCumulativeWindowTimeframeText', () => {
		it('should return correct text for current hour', () => {
			expect(
				getCumulativeWindowTimeframeText({
					...mockEvaluationWindowState,
					windowType: 'cumulative',
					timeframe: 'currentHour',
				}),
			).toBe('Current hour, starting at minute 0 (UTC)');
		});

		it('should return correct text for current day', () => {
			expect(
				getCumulativeWindowTimeframeText({
					...mockEvaluationWindowState,
					windowType: 'cumulative',
					timeframe: 'currentDay',
				}),
			).toBe('Current day, starting from 00:00:00 (UTC)');
		});

		it('should return correct text for current month', () => {
			expect(
				getCumulativeWindowTimeframeText({
					...mockEvaluationWindowState,
					windowType: 'cumulative',
					timeframe: 'currentMonth',
				}),
			).toBe('Current month, starting from day 0 at 00:00:00 (UTC)');
		});

		it('should default to empty string for unknown timeframe', () => {
			expect(
				getCumulativeWindowTimeframeText({
					...mockEvaluationWindowState,
					windowType: 'cumulative',
					timeframe: 'unknown',
				}),
			).toBe('');
		});
	});

	describe('getRollingWindowTimeframeText', () => {
		it('should return correct text for last 5 minutes', () => {
			expect(
				getRollingWindowTimeframeText(RollingWindowTimeframes.LAST_5_MINUTES),
			).toBe('Last 5 minutes');
		});

		it('should return correct text for last 10 minutes', () => {
			expect(
				getRollingWindowTimeframeText(RollingWindowTimeframes.LAST_10_MINUTES),
			).toBe('Last 10 minutes');
		});

		it('should return correct text for last 15 minutes', () => {
			expect(
				getRollingWindowTimeframeText(RollingWindowTimeframes.LAST_15_MINUTES),
			).toBe('Last 15 minutes');
		});

		it('should return correct text for last 30 minutes', () => {
			expect(
				getRollingWindowTimeframeText(RollingWindowTimeframes.LAST_30_MINUTES),
			).toBe('Last 30 minutes');
		});

		it('should return correct text for last 1 hour', () => {
			expect(
				getRollingWindowTimeframeText(RollingWindowTimeframes.LAST_1_HOUR),
			).toBe('Last 1 hour');
		});

		it('should return correct text for last 2 hours', () => {
			expect(
				getRollingWindowTimeframeText(RollingWindowTimeframes.LAST_2_HOURS),
			).toBe('Last 2 hours');
		});

		it('should return correct text for last 4 hours', () => {
			expect(
				getRollingWindowTimeframeText(RollingWindowTimeframes.LAST_4_HOURS),
			).toBe('Last 4 hours');
		});

		it('should default to Last 5 minutes for unknown timeframe', () => {
			expect(
				getRollingWindowTimeframeText('unknown' as RollingWindowTimeframes),
			).toBe('');
		});
	});

	describe('getCustomRollingWindowTimeframeText', () => {
		it('should return correct text for custom rolling window', () => {
			expect(getCustomRollingWindowTimeframeText(mockEvaluationWindowState)).toBe(
				'Last 0 Minutes',
			);
		});
	});

	describe('getTimeframeText', () => {
		it('should call getCustomRollingWindowTimeframeText for custom rolling window', () => {
			expect(
				getTimeframeText({
					...mockEvaluationWindowState,
					windowType: 'rolling',
					timeframe: 'custom',
					startingAt: {
						...mockEvaluationWindowState.startingAt,
						number: '4',
					},
				}),
			).toBe('Last 4 Minutes');
		});

		it('should call getRollingWindowTimeframeText for rolling window', () => {
			expect(getTimeframeText(mockEvaluationWindowState)).toBe('Last 5 minutes');
		});

		it('should call getCumulativeWindowTimeframeText for cumulative window', () => {
			expect(
				getTimeframeText({
					...mockEvaluationWindowState,
					windowType: 'cumulative',
					timeframe: 'currentDay',
				}),
			).toBe('Current day, starting from 00:00:00 (UTC)');
		});
	});

	describe('buildAlertScheduleFromRRule', () => {
		const mockRRule = {
			all: jest.fn((callback) => {
				const dates = [
					new Date(MOCK_DATE_STRING),
					new Date('2024-01-16T10:30:00Z'),
					new Date('2024-01-17T10:30:00Z'),
				];
				dates.forEach((date, index) => callback(date, index));
			}),
		};

		beforeEach(() => {
			(rrulestr as jest.Mock).mockReturnValue(mockRRule);
		});

		it('should return null for empty rrule string', () => {
			const result = buildAlertScheduleFromRRule('', null, '10:30:00');
			expect(result).toBeNull();
		});

		it('should build schedule from valid rrule string', () => {
			const result = buildAlertScheduleFromRRule(
				FREQ_DAILY,
				null,
				TEN_THIRTY_TIME,
			);

			expect(rrulestr).toHaveBeenCalledWith(FREQ_DAILY);
			expect(result).toEqual([
				new Date(MOCK_DATE_STRING),
				new Date('2024-01-16T10:30:00Z'),
				new Date('2024-01-17T10:30:00Z'),
			]);
		});

		it('should handle rrule with DTSTART', () => {
			const date = dayjs('2024-01-20');
			buildAlertScheduleFromRRule(FREQ_DAILY, date, NINE_AM_TIME);

			// When date is provided, DTSTART is automatically added to the rrule string
			expect(rrulestr).toHaveBeenCalledWith(
				expect.stringMatching(/DTSTART:20240120T\d{6}Z/),
			);
		});

		it('should handle rrule without DTSTART', () => {
			// Test with no date provided - should use original rrule string
			const result = buildAlertScheduleFromRRule(FREQ_DAILY, null, NINE_AM_TIME);

			expect(rrulestr).toHaveBeenCalledWith(FREQ_DAILY);
			expect(result).toHaveLength(3);
		});

		it('should handle escaped newlines', () => {
			buildAlertScheduleFromRRule('FREQ=DAILY\\nINTERVAL=1', null, '10:30:00');

			expect(rrulestr).toHaveBeenCalledWith('FREQ=DAILY\nINTERVAL=1');
		});

		it('should limit occurrences to maxOccurrences', () => {
			const result = buildAlertScheduleFromRRule(FREQ_DAILY, null, '10:30:00', 2);

			expect(result).toHaveLength(2);
		});

		it('should return null on error', () => {
			(rrulestr as jest.Mock).mockImplementation(() => {
				throw new Error('Invalid rrule');
			});

			const result = buildAlertScheduleFromRRule('INVALID', null, '10:30:00');
			expect(result).toBeNull();
		});
	});

	describe('buildAlertScheduleFromCustomSchedule', () => {
		it('should generate monthly occurrences', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['1', '15'],
				'10:30:00',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'15-01-2024 10:30:00',
				'01-02-2024 10:30:00',
				'15-02-2024 10:30:00',
				'01-03-2024 10:30:00',
				'15-03-2024 10:30:00',
			]);
		});

		it('should generate weekly occurrences', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'week',
				['monday', 'friday'],
				'12:30:00',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'15-01-2024 12:30:00',
				'19-01-2024 12:30:00',
				'22-01-2024 12:30:00',
				'26-01-2024 12:30:00',
				'29-01-2024 12:30:00',
			]);
		});

		it('should generate weekly occurrences including today if alert time is in the future', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'week',
				['monday', 'friday'],
				'10:30:00',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			// today included (15-01-2024 00:30:00)
			expect(result?.map((res) => formatDate(res))).toEqual([
				'15-01-2024 10:30:00',
				'19-01-2024 10:30:00',
				'22-01-2024 10:30:00',
				'26-01-2024 10:30:00',
				'29-01-2024 10:30:00',
			]);
		});

		it('should generate weekly occurrences excluding today if alert time is in the past', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'week',
				['monday', 'friday'],
				'00:00:00',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			// today excluded (15-01-2024 00:30:00)
			expect(result?.map((res) => formatDate(res))).toEqual([
				'19-01-2024 00:00:00',
				'22-01-2024 00:00:00',
				'26-01-2024 00:00:00',
				'29-01-2024 00:00:00',
				'02-02-2024 00:00:00',
			]);
		});

		it('should generate weekly occurrences excluding today if alert time is in the present (right now)', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'week',
				['monday', 'friday'],
				'00:30:00',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			// today excluded (15-01-2024 00:30:00)
			expect(result?.map((res) => formatDate(res))).toEqual([
				'19-01-2024 00:30:00',
				'22-01-2024 00:30:00',
				'26-01-2024 00:30:00',
				'29-01-2024 00:30:00',
				'02-02-2024 00:30:00',
			]);
		});

		it('should generate monthly occurrences including today if alert time is in the future', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['15'],
				'10:30:00',
				5,
			);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			// today included (15-01-2024 10:30:00)
			expect(result?.map((res) => formatDate(res))).toEqual([
				'15-01-2024 10:30:00',
				'15-02-2024 10:30:00',
				'15-03-2024 10:30:00',
				'15-04-2024 10:30:00',
				'15-05-2024 10:30:00',
			]);
		});

		it('should generate monthly occurrences excluding today if alert time is in the past', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['15'],
				'00:00:00',
				5,
			);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			// today excluded (15-01-2024 10:30:00)
			expect(result?.map((res) => formatDate(res))).toEqual([
				'15-02-2024 00:00:00',
				'15-03-2024 00:00:00',
				'15-04-2024 00:00:00',
				'15-05-2024 00:00:00',
				'15-06-2024 00:00:00',
			]);
		});

		it('should generate monthly occurrences excluding today if alert time is in the present (right now)', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['15'],
				'00:30:00',
				5,
			);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			// today excluded (15-01-2024 10:30:00)
			expect(result?.map((res) => formatDate(res))).toEqual([
				'15-02-2024 00:30:00',
				'15-03-2024 00:30:00',
				'15-04-2024 00:30:00',
				'15-05-2024 00:30:00',
				'15-06-2024 00:30:00',
			]);
		});

		it('should account for february 29th in a leap year', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['29'],
				'10:30:00',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'29-01-2024 10:30:00',
				'29-02-2024 10:30:00',
				'29-03-2024 10:30:00',
				'29-04-2024 10:30:00',
				'29-05-2024 10:30:00',
			]);
		});

		it('should skip 31st on 30-day months', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['31'],
				'10:30:00',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'31-01-2024 10:30:00',
				'31-03-2024 10:30:00',
				'31-05-2024 10:30:00',
				'31-07-2024 10:30:00',
				'31-08-2024 10:30:00',
			]);
		});

		it('should skip february 29th in a non-leap year', async () => {
			jest.resetModules(); // clear previous mocks

			jest.doMock('dayjs', () => {
				const originalDayjs = jest.requireActual('dayjs');
				const mockDayjs = (date?: string | Date): Dayjs => {
					if (date) return originalDayjs(date);
					return originalDayjs(MOCK_DATE_STRING_NON_LEAP_YEAR);
				};
				Object.assign(mockDayjs, originalDayjs);
				return mockDayjs;
			});

			const { buildAlertScheduleFromCustomSchedule } = await import('../utils');
			const { default: dayjs } = await import('dayjs');

			const formatDate = (date: Date): string =>
				dayjs(date).format('DD-MM-YYYY HH:mm:ss');

			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['29'],
				'10:30:00',
				5,
			);

			expect(result?.map((res) => formatDate(res))).toEqual([
				'29-01-2023 10:30:00',
				'29-03-2023 10:30:00',
				'29-04-2023 10:30:00',
				'29-05-2023 10:30:00',
				'29-06-2023 10:30:00',
			]);
		});

		it('should generate daily occurrences', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'day',
				[],
				'10:40:00',
				5,
			);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'15-01-2024 10:40:00',
				'16-01-2024 10:40:00',
				'17-01-2024 10:40:00',
				'18-01-2024 10:40:00',
				'19-01-2024 10:40:00',
			]);
		});

		it('should generate daily occurrences excluding today if alert time is in the past', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'day',
				[],
				'00:00:00',
				5,
			);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'16-01-2024 00:00:00',
				'17-01-2024 00:00:00',
				'18-01-2024 00:00:00',
				'19-01-2024 00:00:00',
				'20-01-2024 00:00:00',
			]);
		});

		it('should generate daily occurrences excluding today if alert time is in the present (right now)', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'day',
				[],
				'00:30:00',
				5,
			);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'16-01-2024 00:30:00',
				'17-01-2024 00:30:00',
				'18-01-2024 00:30:00',
				'19-01-2024 00:30:00',
				'20-01-2024 00:30:00',
			]);
		});

		it('should generate daily occurrences including today if alert time is in the future', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'day',
				[],
				'10:30:00',
				5,
			);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'15-01-2024 10:30:00',
				'16-01-2024 10:30:00',
				'17-01-2024 10:30:00',
				'18-01-2024 10:30:00',
				'19-01-2024 10:30:00',
			]);
		});

		it('daily occurrences should span across months correctly', async () => {
			jest.resetModules(); // clear previous mocks

			jest.doMock('dayjs', () => {
				const originalDayjs = jest.requireActual('dayjs');
				const mockDayjs = (date?: string | Date): Dayjs => {
					if (date) return originalDayjs(date);
					return originalDayjs(MOCK_DATE_STRING_SPANS_MONTHS);
				};
				Object.assign(mockDayjs, originalDayjs);
				return mockDayjs;
			});

			const { buildAlertScheduleFromCustomSchedule } = await import('../utils');
			const { default: dayjs } = await import('dayjs');

			const formatDate = (date: Date): string =>
				dayjs(date).format('DD-MM-YYYY HH:mm:ss');

			const result = buildAlertScheduleFromCustomSchedule(
				'day',
				[],
				'10:30:00',
				5,
			);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result?.map((res) => formatDate(res))).toEqual([
				'31-01-2024 10:30:00',
				'01-02-2024 10:30:00',
				'02-02-2024 10:30:00',
				'03-02-2024 10:30:00',
				'04-02-2024 10:30:00',
			]);
		});
	});

	describe('isValidRRule', () => {
		beforeEach(() => {
			(rrulestr as jest.Mock).mockReturnValue({});
		});

		it('should return true for valid rrule', () => {
			expect(isValidRRule(FREQ_DAILY)).toBe(true);
			expect(rrulestr).toHaveBeenCalledWith(FREQ_DAILY);
		});

		it('should handle escaped newlines', () => {
			expect(isValidRRule('FREQ=DAILY\\nINTERVAL=1')).toBe(true);
			expect(rrulestr).toHaveBeenCalledWith('FREQ=DAILY\nINTERVAL=1');
		});

		it('should return false for invalid rrule', () => {
			(rrulestr as jest.Mock).mockImplementation(() => {
				throw new Error('Invalid rrule');
			});

			expect(isValidRRule('INVALID')).toBe(false);
		});
	});
});
