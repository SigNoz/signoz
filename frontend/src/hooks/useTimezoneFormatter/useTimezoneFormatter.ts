import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useCallback, useEffect, useMemo } from 'react';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Types
export type TimestampInput = string | number | Date;
interface CacheEntry {
	value: string;
	timestamp: number;
}

//

// Constants
const CACHE_SIZE_LIMIT = 1000;
const CACHE_CLEANUP_PERCENTAGE = 0.5; // Remove 50% when limit is reached

function useTimezoneFormatter({
	userTimezone,
}: {
	userTimezone: Timezone;
}): {
	formatTimezoneAdjustedTimestamp: (
		input: TimestampInput,
		format?: string,
	) => string;
} {
	// Initialize cache using useMemo to persist between renders
	const cache = useMemo(() => new Map<string, CacheEntry>(), []);

	// Clear cache when timezone changes
	useEffect(() => {
		cache.clear();
	}, [cache, userTimezone]);

	const clearCacheEntries = useCallback(() => {
		if (cache.size <= CACHE_SIZE_LIMIT) return;

		// Sort entries by timestamp (oldest first)
		const sortedEntries = Array.from(cache.entries()).sort(
			(a, b) => a[1].timestamp - b[1].timestamp,
		);

		// Calculate how many entries to remove (50% or overflow, whichever is larger)
		const entriesToRemove = Math.max(
			Math.floor(cache.size * CACHE_CLEANUP_PERCENTAGE),
			cache.size - CACHE_SIZE_LIMIT,
		);

		// Remove oldest entries
		sortedEntries.slice(0, entriesToRemove).forEach(([key]) => cache.delete(key));
	}, [cache]);

	/**
	 * Formats a timestamp with the user's timezone and caches the result
	 * @param {TimestampInput} input - The timestamp to format (string, number, or Date)
	 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - The desired output format
	 * @returns {string} The formatted timestamp string in the user's timezone
	 * @example
	 * // Input: UTC timestamp
	 * // User timezone: 'UTC - 4'
	 * // Returns: "2024-03-14 15:30:00"
	 * formatTimezoneAdjustedTimestamp('2024-03-14T19:30:00Z')
	 */
	const formatTimezoneAdjustedTimestamp = useCallback(
		(
			input: TimestampInput,
			format = DATE_TIME_FORMATS.ISO_DATETIME_SECONDS as string,
		): string => {
			const timestamp = dayjs(input).valueOf();
			const cacheKey = `${timestamp}_${userTimezone.value}`;

			// Check cache first
			const cachedValue = cache.get(cacheKey);
			if (cachedValue) {
				return cachedValue.value;
			}
			// Format timestamp
			const formattedValue = dayjs(input).tz(userTimezone.value).format(format);

			// Update cache
			cache.set(cacheKey, {
				value: formattedValue,
				timestamp: Date.now(),
			});

			// Clear expired entries and enforce size limit
			if (cache.size > CACHE_SIZE_LIMIT) {
				clearCacheEntries();
			}

			return formattedValue;
		},
		[cache, clearCacheEntries, userTimezone.value],
	);

	return { formatTimezoneAdjustedTimestamp };
}

export default useTimezoneFormatter;
