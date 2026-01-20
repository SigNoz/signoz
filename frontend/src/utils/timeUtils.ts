import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';

dayjs.extend(customParseFormat);

dayjs.extend(duration);

export function toUTCEpoch(time: number): number {
	const x = new Date();
	return time + x.getTimezoneOffset() * 60 * 1000;
}

export const getFormattedDate = (epochTimestamp: number): string => {
	// Convert epoch timestamp to a date
	const date = dayjs.unix(epochTimestamp);

	// Format the date as "18 Nov 2013"
	return date.format(DATE_TIME_FORMATS.MONTH_DATE_SHORT);
};

export const getFormattedDateWithMinutes = (epochTimestamp: number): string => {
	// Convert epoch timestamp to a date
	const date = dayjs.unix(epochTimestamp);

	// Format the date as "18 Nov 2013"
	return date.format(DATE_TIME_FORMATS.MONTH_DATETIME_SHORT);
};

export const getRemainingDays = (billingEndDate: number): number => {
	// Convert Epoch timestamps to Date objects
	const startDate = new Date(); // Convert seconds to milliseconds
	const endDate = new Date(billingEndDate * 1000); // Convert seconds to milliseconds

	// Calculate the time difference in milliseconds
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const timeDifference = endDate - startDate;

	return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
};

/**
 * Calculates the duration from the given epoch timestamp to the current time.
 *
 *
 * @param {number} epochTimestamp
 * @returns {string} - human readable string representing the duration from the given epoch timestamp to the current time e.g. "3d 14h"
 */
export const getDurationFromNow = (epochTimestamp: number): string => {
	const now = dayjs();
	const inputTime = dayjs(epochTimestamp);
	const duration = dayjs.duration(now.diff(inputTime));

	const days = duration.days();
	const hours = duration.hours();
	const minutes = duration.minutes();
	const seconds = duration.seconds();

	let result = '';
	if (days > 0) result += `${days}d `;
	if (hours > 0) result += `${hours}h `;
	if (minutes > 0) result += `${minutes}m `;
	if (seconds > 0) result += `${seconds}s`;

	return result.trim();
};

/**
 * Formats an epoch timestamp into a human-readable date and time string.
 *
 * @param {number} epoch - The epoch timestamp to format.
 * @returns {string} - The formatted date and time string in the format "MMM D, YYYY ⎯ HH:MM:SS".
 */
export function formatEpochTimestamp(epoch: number): string {
	const date = new Date(epoch);

	const optionsDate: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	};

	const optionsTime: Intl.DateTimeFormatOptions = {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	};

	const formattedDate = date.toLocaleDateString('en-US', optionsDate);
	const formattedTime = date.toLocaleTimeString('en-US', optionsTime);

	return `${formattedDate} ⎯ ${formattedTime}`;
}

/**
 * Converts a given number of seconds into a human-readable format.
 * @param {number} seconds The number of seconds to convert.
 * @returns  {string} The formatted time string, either in days (e.g., "1.2d"), hours (e.g., "1.2h"), minutes (e.g., "~7m"), or seconds (e.g., "~45s").
 */

export function formatTime(seconds: number): string {
	const days = seconds / 86400;

	if (days >= 1) {
		return `${days.toFixed(1)}d`;
	}

	const hours = seconds / 3600;
	if (hours >= 1) {
		return `${hours.toFixed(1)}h`;
	}

	const minutes = seconds / 60;
	if (minutes >= 1) {
		return `${minutes.toFixed(1)}m`;
	}

	return `${seconds.toFixed(1)}s`;
}

export const nanoToMilli = (nanoseconds: number): number =>
	nanoseconds / 1_000_000;

export const secondsToMilliseconds = (seconds: number): number =>
	seconds * 1_000;

export const epochToTimeString = (epochMs: number): string => {
	const date = new Date(epochMs);
	const options: Intl.DateTimeFormatOptions = {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	};
	return date.toLocaleTimeString('en-US', options);
};

/**
 * Converts nanoseconds to milliseconds
 * @param timestamp - The timestamp to convert
 * @returns The timestamp in milliseconds
 */
export const normalizeTimeToMs = (timestamp: number | string): number => {
	let ts = timestamp;
	if (typeof timestamp === 'string') {
		ts = Math.trunc(parseInt(timestamp, 10));
	}
	ts = Number(ts);

	// Check if timestamp is in nanoseconds (19+ digits)
	const isNanoSeconds = ts.toString().length >= 19;

	return isNanoSeconds ? Math.floor(ts / 1_000_000) : ts;
};

export const hasDatePassed = (expiresAt: string): boolean => {
	const date = dayjs(expiresAt);

	if (!date.isValid()) {
		return false;
	}

	return date.isBefore(dayjs(), 'day');
};

export const getDaysUntilExpiry = (expiresAt: string): number => {
	const date = dayjs(expiresAt);
	if (!date.isValid()) return 0;
	return date.diff(dayjs(), 'day');
};

export interface TimeRangeValidationResult {
	isValid: boolean;
	errorDetails?: {
		message: string;
		code: string;
		description: string;
	};
	startTimeMs?: number;
	endTimeMs?: number;
}

/**
 * Validates a start and end datetime string.
 *
 * Validation rules:
 * 1. Both start and end must be valid date-time values
 * 2. End time must be after start time
 * 3. End time must not be in the future
 *
 * Assumptions:
 * - Input values follow the provided date-time format
 * - All comparisons are performed in epoch milliseconds
 *
 * @param startTime - Start datetime string
 * @param endTime - End datetime string
 * @param format - Expected date-time format (e.g. DD/MM/YYYY HH:mm:ss)
 * @returns Validation result with parsed epoch milliseconds
 */
export const validateTimeRange = (
	startTime: string,
	endTime: string,
	format: string,
): TimeRangeValidationResult => {
	const start = dayjs(startTime, format, true);
	const end = dayjs(endTime, format, true);
	const now = dayjs();
	const startTimeMs = start.valueOf();
	const endTimeMs = end.valueOf();

	// Invalid format or parsing failure
	if (!start.isValid() || !end.isValid()) {
		return {
			isValid: false,
			errorDetails: {
				message: 'Invalid date/time format',
				code: 'INVALID_DATE_TIME_FORMAT',
				description: `
Enter a valid date/time. e.g. 


Range:
${now.subtract(1, 'hour').format(format)} - ${now.format(format)}

Shortcuts:
15m, 2h, 2d, 2w
`,
			},
		};
	}

	// dates must not be in the future
	if (start.isAfter(now) || end.isAfter(now)) {
		return {
			isValid: false,
			errorDetails: {
				message: 'Dates in the future',
				code: 'DATES_IN_THE_FUTURE',
				description:
					'Dates must not be in the future. Enter a past or current date/time.',
			},
		};
	}

	// start time must be before end time
	if (startTimeMs >= endTimeMs) {
		return {
			isValid: false,
			errorDetails: {
				message: 'Start time after end time',
				code: 'START_TIME_AFTER_END_TIME',
				description:
					'Start time must be before end time. Change the start or end so the range is chronological.',
			},
		};
	}

	return {
		isValid: true,
		startTimeMs,
		endTimeMs,
	};
};
