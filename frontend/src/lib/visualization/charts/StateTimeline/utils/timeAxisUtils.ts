import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import type { TickMark, TimeRange } from '../types';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Target number of ticks to display on the time axis (aiming for 5-10). */
const TARGET_TICKS = 7;

/** Human-friendly interval values in seconds, from 1 minute to 30 days. */
const INTERVALS = [
	60, // 1 min
	300, // 5 min
	600, // 10 min
	900, // 15 min
	1800, // 30 min
	3600, // 1 hour
	7200, // 2 hours
	14400, // 4 hours
	21600, // 6 hours
	43200, // 12 hours
	86400, // 1 day
	172800, // 2 days
	604800, // 7 days
	2592000, // 30 days
];

/** One day in seconds, used to determine the time format. */
const ONE_DAY_SECONDS = 86400;

/**
 * Computes a human-friendly tick interval given the total time range in seconds.
 * Snaps to the smallest pre-defined interval that produces <= TARGET_TICKS ticks.
 */
export function computeTickInterval(timeRangeSeconds: number): number {
	const rawInterval = timeRangeSeconds / TARGET_TICKS;
	return (
		INTERVALS.find((interval) => interval >= rawInterval) ??
		INTERVALS[INTERVALS.length - 1]
	);
}

/**
 * Determines the dayjs format based on the range duration. Short ranges (< 1 day)
 * use time-only format; longer ranges include the date.
 */
function getTickFormat(timeRangeSeconds: number): string {
	if (timeRangeSeconds < ONE_DAY_SECONDS) {
		return 'HH:mm';
	}
	if (timeRangeSeconds <= ONE_DAY_SECONDS * 7) {
		return 'MMM DD HH:mm';
	}
	return 'MMM DD';
}

/**
 * Generates evenly spaced tick marks aligned to human-friendly intervals.
 * Positions are 0-1 fractions of total width, where 0 is `timeRange.start` and
 * 1 is `timeRange.end`.
 */
export function generateTicks(
	timeRange: TimeRange,
	width: number,
	tz: string,
): TickMark[] {
	const totalDuration = timeRange.end - timeRange.start;
	if (totalDuration <= 0 || width <= 0) {
		return [];
	}

	const interval = computeTickInterval(totalDuration);
	const format = getTickFormat(totalDuration);
	// Align the first tick to the nearest interval boundary at or after the start.
	const firstTickTimestamp = Math.ceil(timeRange.start / interval) * interval;

	const ticks: TickMark[] = [];
	for (
		let timestamp = firstTickTimestamp;
		timestamp <= timeRange.end;
		timestamp += interval
	) {
		const position = (timestamp - timeRange.start) / totalDuration;
		if (position >= 0 && position <= 1) {
			ticks.push({
				position,
				label: dayjs.unix(timestamp).tz(tz).format(format),
				timestamp,
			});
		}
	}
	return ticks;
}
