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
	const minTime = Number.parseInt(minStr, 10);
	const maxTime = Number.parseInt(maxStr, 10);

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
 * @deprecated Use store.getAutoRefreshQueryKey() instead.
 * Access via: const getAutoRefreshQueryKey = useGlobalTime((s) => s.getAutoRefreshQueryKey);
 *
 * This function only works with the default (unnamed) store prefix.
 * For named stores, use the store method to get properly scoped query keys.
 */
export function getAutoRefreshQueryKey(
	selectedTime: GlobalTimeSelectedTime,
	...queryParts: unknown[]
): unknown[] {
	if (process.env.NODE_ENV === 'development') {
		console.warn(
			'[globalTime] getAutoRefreshQueryKey from utils is deprecated. ' +
				'Use useGlobalTime((s) => s.getAutoRefreshQueryKey) instead.',
		);
	}
	return [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, ...queryParts, selectedTime];
}

/**
 * Round timestamp down to the nearest 5-second boundary.
 * Used for tighter sync during auto-refresh scenarios.
 *
 * @param timestampNano - Timestamp in nanoseconds
 * @returns Timestamp rounded down to 5-second boundary in nanoseconds
 */
export function roundDownTo5Seconds(timestampNano: number): number {
	const msPerInterval = 5 * 1000;
	const timestampMs = Math.floor(timestampNano / NANO_SECOND_MULTIPLIER);
	const roundedMs = Math.floor(timestampMs / msPerInterval) * msPerInterval;
	return roundedMs * NANO_SECOND_MULTIPLIER;
}

/**
 * Compute min/max time with maxTime rounded down to 5-second boundary.
 * Used when isRefreshEnabled is true for tighter time sync.
 *
 * @param selectedTime - The selected time (relative like '15m' or custom range)
 * @returns ParsedTimeRange with 5-second rounded maxTime for relative times
 */
export function computeRounded5sMinMax(selectedTime: string): ParsedTimeRange {
	if (isCustomTimeRange(selectedTime)) {
		return parseSelectedTime(selectedTime);
	}

	const nowNano = Date.now() * NANO_SECOND_MULTIPLIER;
	const roundedMaxTime = roundDownTo5Seconds(nowNano);

	const { minTime: originalMin, maxTime: originalMax } =
		getMinMaxForSelectedTime(selectedTime as Time, 0, 0);
	const durationNano = originalMax - originalMin;

	return {
		minTime: roundedMaxTime - durationNano,
		maxTime: roundedMaxTime,
	};
}
