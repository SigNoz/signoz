import { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { getMinMaxForSelectedTime } from 'lib/getMinMax';

import { REACT_QUERY_KEY } from '../../constants/reactQueryKeys';
import {
	CustomTimeRange,
	CustomTimeRangeSeparator,
	GlobalTimeSelectedTime,
	ParsedTimeRange,
} from './types';

/**
 * Custom time range separator used in the selectedTime string
 */
export const CUSTOM_TIME_SEPARATOR: CustomTimeRangeSeparator = '||_||';

/**
 * Check if selectedTime represents a custom time range
 */
export function isCustomTimeRange(
	selectedTime: string,
): selectedTime is CustomTimeRange {
	return selectedTime.includes(CUSTOM_TIME_SEPARATOR);
}

/**
 * Create a custom time range string from min/max times (in nanoseconds)
 */
export function createCustomTimeRange(
	minTime: number,
	maxTime: number,
): CustomTimeRange {
	return `${minTime}${CUSTOM_TIME_SEPARATOR}${maxTime}`;
}

/**
 * Parse the custom time range string to get min/max times (in nanoseconds)
 */
export function parseCustomTimeRange(
	selectedTime: string,
): ParsedTimeRange | null {
	if (!isCustomTimeRange(selectedTime)) {
		return null;
	}

	const [minStr, maxStr] = selectedTime.split(CUSTOM_TIME_SEPARATOR);
	const minTime = parseInt(minStr, 10);
	const maxTime = parseInt(maxStr, 10);

	if (Number.isNaN(minTime) || Number.isNaN(maxTime)) {
		return null;
	}

	return { minTime, maxTime };
}

export const NANO_SECOND_MULTIPLIER = 1000000;
const fallbackDurationInNanoSeconds = 30 * 1000 * NANO_SECOND_MULTIPLIER; // 30s

/**
 * Parse the selectedTime string to get min/max time values.
 * For relative times, computes fresh values based on Date.now().
 * For custom times, extracts the stored min/max values.
 */
export function parseSelectedTime(selectedTime: string): ParsedTimeRange {
	if (isCustomTimeRange(selectedTime)) {
		const parsed = parseCustomTimeRange(selectedTime);
		if (parsed) {
			return parsed;
		}
		// Fallback to current time if parsing fails
		const now = Date.now() * NANO_SECOND_MULTIPLIER;
		return { minTime: now - fallbackDurationInNanoSeconds, maxTime: now };
	}

	// It's a relative time like '15m', '1h', etc.
	// Use getMinMaxForSelectedTime which computes from Date.now()
	return getMinMaxForSelectedTime(selectedTime as Time, 0, 0);
}

/**
 * Use to build your react-query key for auto-refresh queries
 */
export function getAutoRefreshQueryKey(
	selectedTime: GlobalTimeSelectedTime,
	...queryParts: unknown[]
): unknown[] {
	return [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, ...queryParts, selectedTime];
}
