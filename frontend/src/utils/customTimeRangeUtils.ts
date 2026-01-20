import { LOCALSTORAGE } from 'constants/localStorage';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import dayjs from 'dayjs';

export interface CustomTimeRange {
	from: string; // ISO string format
	to: string; // ISO string format
	timestamp: number; // When this range was created/used
}

const MAX_STORED_RANGES = 3;

/**
 * Retrieves the list of stored custom time ranges
 * @returns Array of CustomTimeRange objects
 */
export const getCustomTimeRanges = (): CustomTimeRange[] => {
	try {
		const stored = localStorage.getItem(
			LOCALSTORAGE.LAST_USED_CUSTOM_TIME_RANGES,
		);
		if (!stored) return [];

		const parsed = JSON.parse(stored);

		// Validate stored data
		if (Array.isArray(parsed)) {
			return parsed.filter((item) => item && item.from && item.to);
		}

		return [];
	} catch (error) {
		console.warn(
			'Failed to retrieve custom time ranges from localStorage:',
			error,
		);
		return [];
	}
};

/**
 * Adds a new custom time range to the stored list, maintaining only the last 3 used ranges
 * @param dateTimeRange - The DateTimeRangeType from the time picker
 * @returns The updated list of custom time ranges
 */
export const addCustomTimeRange = (
	dateTimeRange: DateTimeRangeType,
): CustomTimeRange[] => {
	if (!dateTimeRange || !dateTimeRange[0] || !dateTimeRange[1]) {
		return getCustomTimeRanges();
	}

	const [startTime, endTime] = dateTimeRange;
	const now = dayjs();

	const newRange: CustomTimeRange = {
		from: startTime.toISOString(),
		to: endTime.toISOString(),
		timestamp: now.unix(),
	};

	// Get existing ranges
	const existingRanges = getCustomTimeRanges();

	// Remove duplicate ranges (same start and end time)
	const filteredRanges = existingRanges.filter(
		(range) =>
			range.from !== startTime.toISOString() || range.to !== endTime.toISOString(),
	);

	// Add new range at the beginning (most recent)
	const updatedRanges = [newRange, ...filteredRanges].slice(
		0,
		MAX_STORED_RANGES,
	);

	// Store in localStorage
	try {
		localStorage.setItem(
			LOCALSTORAGE.LAST_USED_CUSTOM_TIME_RANGES,
			JSON.stringify(updatedRanges),
		);
	} catch (error) {
		console.warn('Failed to save custom time range to localStorage:', error);
	}

	return updatedRanges;
};

/**
 * Clears all stored custom time ranges
 */
export const clearCustomTimeRanges = (): void => {
	try {
		localStorage.removeItem(LOCALSTORAGE.LAST_USED_CUSTOM_TIME_RANGES);
	} catch (error) {
		console.warn('Failed to clear custom time ranges from localStorage:', error);
	}
};

/**
 * Removes a specific custom time range by its timestamp
 * @param timestamp - The timestamp of the range to remove
 * @returns The updated list of custom time ranges
 */
export const removeCustomTimeRange = (timestamp: number): CustomTimeRange[] => {
	const existingRanges = getCustomTimeRanges();
	const updatedRanges = existingRanges.filter(
		(range) => range.timestamp !== timestamp,
	);

	try {
		localStorage.setItem(
			LOCALSTORAGE.LAST_USED_CUSTOM_TIME_RANGES,
			JSON.stringify(updatedRanges),
		);
	} catch (error) {
		console.warn('Failed to update custom time ranges in localStorage:', error);
	}

	return updatedRanges;
};

/**
 * Checks if a time range already exists in the stored list
 * @param dateTimeRange - The DateTimeRangeType to check
 * @returns True if the range already exists
 */
export const isCustomTimeRangeExists = (
	dateTimeRange: DateTimeRangeType,
): boolean => {
	if (!dateTimeRange || !dateTimeRange[0] || !dateTimeRange[1]) {
		return false;
	}

	const [startTime, endTime] = dateTimeRange;
	const existingRanges = getCustomTimeRanges();

	return existingRanges.some(
		(range) =>
			range.from === startTime.toISOString() && range.to === endTime.toISOString(),
	);
};

/**
 * Converts a CustomTimeRange to DateTimeRangeType
 * @param customRange - The CustomTimeRange to convert
 * @returns DateTimeRangeType
 */
export const convertCustomRangeToDateTimeRange = (
	customRange: CustomTimeRange,
): DateTimeRangeType => [dayjs(customRange.from), dayjs(customRange.to)];

/**
 * Converts a DateTimeRangeType to CustomTimeRange format
 * @param dateTimeRange - The DateTimeRangeType to convert
 * @param label - Optional label, will be auto-generated if not provided
 * @returns CustomTimeRange
 */
export const convertDateTimeRangeToCustomRange = (
	dateTimeRange: DateTimeRangeType,
): CustomTimeRange | null => {
	if (!dateTimeRange || !dateTimeRange[0] || !dateTimeRange[1]) {
		return null;
	}

	const [startTime, endTime] = dateTimeRange;

	return {
		from: startTime.toISOString(),
		to: endTime.toISOString(),

		timestamp: Date.now(),
	};
};
