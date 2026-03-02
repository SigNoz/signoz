/**
 * Logs Explorer zoom-out ladder:
 * - 3x until 1 day: 15m → 45m → 2h15m → 6h45m → 20h15m
 * - Then fixed: 1d → 2d → 3d → 1w → 2w → 1m
 * - After 1 month: wrap to 15m
 */

import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';

const MS_PER_MIN = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Ladder steps in milliseconds (ordered from smallest to largest) */
const ZOOM_OUT_LADDER_MS: number[] = [
	15 * MS_PER_MIN, // 15m
	45 * MS_PER_MIN, // 45m
	2 * MS_PER_HOUR + 15 * MS_PER_MIN, // 2h15m
	6 * MS_PER_HOUR + 45 * MS_PER_MIN, // 6h45m
	20 * MS_PER_HOUR + 15 * MS_PER_MIN, // 20h15m
	1 * MS_PER_DAY, // 1d
	2 * MS_PER_DAY, // 2d
	3 * MS_PER_DAY, // 3d
	1 * MS_PER_WEEK, // 1w
	2 * MS_PER_WEEK, // 2w
	30 * MS_PER_DAY, // 1m (approx)
];

const LADDER_LAST_INDEX = ZOOM_OUT_LADDER_MS.length - 1;
const MIN_DURATION = ZOOM_OUT_LADDER_MS[0];
const MAX_DURATION = ZOOM_OUT_LADDER_MS[LADDER_LAST_INDEX];

/** Preset labels for ladder steps supported by GetMinMax (shows "Last 15 minutes" etc. instead of "Custom") */
const PRESET_FOR_DURATION_MS: Record<number, Time> = {
	[15 * MS_PER_MIN]: '15m',
	[45 * MS_PER_MIN]: '45m',
	[1 * MS_PER_DAY]: '1d',
	[3 * MS_PER_DAY]: '3d',
	[1 * MS_PER_WEEK]: '1w',
	[2 * MS_PER_WEEK]: '2w',
	[30 * MS_PER_DAY]: '1month',
};

/**
 * Returns the next duration in the zoom-out ladder for the given current duration.
 * If at or past 1 month, returns 15m (wrap).
 */
export function getNextDurationInLadder(durationMs: number): number {
	if (durationMs >= MAX_DURATION) {
		return MIN_DURATION; // Wrap: 1m → 15m
	}

	// Find the smallest ladder step that is strictly greater than current duration
	for (let i = 0; i < ZOOM_OUT_LADDER_MS.length; i++) {
		if (ZOOM_OUT_LADDER_MS[i] > durationMs) {
			return ZOOM_OUT_LADDER_MS[i];
		}
	}

	return MIN_DURATION;
}

export interface ZoomOutResult {
	range: [number, number];
	/** Preset key (e.g. '15m') when range matches a preset - use for display instead of "Custom Date Range" */
	preset: Time | null;
}

/**
 * Computes the next zoomed-out time range.
 * Phase 1 (center-anchored): While new end <= now, expand from center.
 * Phase 2 (end-anchored at now): When new end would exceed now, anchor end at now and move start backward.
 *
 * @returns ZoomOutResult with range and preset (or null if no change)
 */
export function getNextZoomOutRange(
	startMs: number,
	endMs: number,
): ZoomOutResult | null {
	const nowMs = Date.now();
	const durationMs = endMs - startMs;

	if (durationMs <= 0) {
		return null;
	}

	const newDurationMs = getNextDurationInLadder(durationMs);
	const centerMs = startMs + durationMs / 2;
	const computedEndMs = centerMs + newDurationMs / 2;

	let newStartMs: number;
	let newEndMs: number;

	if (computedEndMs <= nowMs) {
		// Phase 1: center-anchored
		newStartMs = centerMs - newDurationMs / 2;
		newEndMs = computedEndMs;
	} else {
		// Phase 2: end-anchored at now
		newStartMs = nowMs - newDurationMs;
		newEndMs = nowMs;
	}

	const preset = PRESET_FOR_DURATION_MS[newDurationMs] ?? null;

	return {
		range: [Math.round(newStartMs), Math.round(newEndMs)],
		preset,
	};
}
