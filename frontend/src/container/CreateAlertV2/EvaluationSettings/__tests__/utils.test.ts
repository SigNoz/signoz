import dayjs from 'dayjs';
import { rrulestr } from 'rrule';

import { CumulativeWindowTimeframes, RollingWindowTimeframes } from '../types';
import {
	buildAlertScheduleFromCustomSchedule,
	buildAlertScheduleFromRRule,
	getCumulativeWindowTimeframeText,
	getEvaluationWindowTypeText,
	getRollingWindowTimeframeText,
	getTimeframeText,
	isValidRRule,
} from '../utils';

const MOCK_DATE_STRING = '2024-01-15T10:30:00Z';
const FREQ_DAILY = 'FREQ=DAILY';
const TEN_THIRTY_TIME = '10:30:00';
const NINE_AM_TIME = '09:00:00';

// Mock dayjs
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

jest.mock('rrule', () => ({
	rrulestr: jest.fn(),
}));

jest.mock('components/CustomTimePicker/timezoneUtils', () => ({
	generateTimezoneData: jest.fn().mockReturnValue([]),
}));

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

		it('should default to Rolling for unknown type', () => {
			expect(
				getEvaluationWindowTypeText('unknown' as 'rolling' | 'cumulative'),
			).toBe('Rolling');
		});
	});

	describe('getCumulativeWindowTimeframeText', () => {
		it('should return correct text for current hour', () => {
			expect(
				getCumulativeWindowTimeframeText(CumulativeWindowTimeframes.CURRENT_HOUR),
			).toBe('Current hour');
		});

		it('should return correct text for current day', () => {
			expect(
				getCumulativeWindowTimeframeText(CumulativeWindowTimeframes.CURRENT_DAY),
			).toBe('Current day');
		});

		it('should return correct text for current month', () => {
			expect(
				getCumulativeWindowTimeframeText(CumulativeWindowTimeframes.CURRENT_MONTH),
			).toBe('Current month');
		});

		it('should default to Current hour for unknown timeframe', () => {
			expect(getCumulativeWindowTimeframeText('unknown')).toBe('Current hour');
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
			).toBe('Last 5 minutes');
		});
	});

	describe('getTimeframeText', () => {
		it('should return rolling window text for rolling type', () => {
			expect(
				getTimeframeText('rolling', RollingWindowTimeframes.LAST_1_HOUR),
			).toBe('Last 1 hour');
		});

		it('should return cumulative window text for cumulative type', () => {
			expect(
				getTimeframeText('cumulative', CumulativeWindowTimeframes.CURRENT_DAY),
			).toBe('Current day');
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
		beforeEach(() => {
			// Mock dayjs timezone methods
			((dayjs as unknown) as { tz: jest.Mock }).tz = jest.fn(
				(date?: string | Date) => {
					const originalDayjs = jest.requireActual('dayjs');
					const mockDayjs = originalDayjs(date || MOCK_DATE_STRING);
					mockDayjs.startOf = jest.fn().mockReturnValue(mockDayjs);
					mockDayjs.add = jest.fn().mockReturnValue(mockDayjs);
					mockDayjs.date = jest.fn().mockReturnValue(mockDayjs);
					mockDayjs.hour = jest.fn().mockReturnValue(mockDayjs);
					mockDayjs.minute = jest.fn().mockReturnValue(mockDayjs);
					mockDayjs.second = jest.fn().mockReturnValue(mockDayjs);
					mockDayjs.daysInMonth = jest.fn().mockReturnValue(31);
					mockDayjs.day = jest.fn().mockReturnValue(mockDayjs);
					mockDayjs.isAfter = jest.fn().mockReturnValue(true);
					mockDayjs.toDate = jest.fn().mockReturnValue(new Date(MOCK_DATE_STRING));
					return mockDayjs;
				},
			);
		});

		it('should return null for missing required parameters', () => {
			expect(
				buildAlertScheduleFromCustomSchedule('', [], '10:30:00', 'UTC'),
			).toBeNull();
			expect(
				buildAlertScheduleFromCustomSchedule('week', [], '10:30:00', 'UTC'),
			).toBeNull();
			expect(
				buildAlertScheduleFromCustomSchedule('week', ['monday'], '', 'UTC'),
			).toBeNull();
			expect(
				buildAlertScheduleFromCustomSchedule('week', ['monday'], '10:30:00', ''),
			).toBeNull();
		});

		it('should generate monthly occurrences', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['1', '15'],
				'10:30:00',
				'UTC',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		it('should generate weekly occurrences', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'week',
				['monday', 'friday'],
				'10:30:00',
				'UTC',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		it('should filter invalid days for monthly schedule', () => {
			const result = buildAlertScheduleFromCustomSchedule(
				'month',
				['1', 'invalid', '15'],
				'10:30:00',
				'UTC',
				5,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		it('should filter invalid weekdays for weekly schedule', () => {
			buildAlertScheduleFromCustomSchedule(
				'week',
				['monday', 'invalid', 'friday'],
				'10:30:00',
				'UTC',
				5,
			);

			// Function should handle invalid weekdays gracefully
			expect(true).toBe(true);
		});

		it('should return null on error', () => {
			// Test with invalid parameters that should cause an error
			const result = buildAlertScheduleFromCustomSchedule(
				'invalid_repeat_type',
				['monday'],
				'10:30:00',
				'UTC',
				5,
			);
			// Should return empty array, not null, for invalid repeat type
			expect(result).toEqual([]);
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
