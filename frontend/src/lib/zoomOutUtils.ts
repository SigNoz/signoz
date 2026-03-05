/**
 * Custom Time Picker zoom-out ladder:
 * - Until 1 day: 15m → 45m → 2hr → 7hr → 21hr
 * - Then fixed: 1d → 2d → 3d → 1w → 2w → 1m
 * - At 1 month: zoom out is disabled (max range)
 */

import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';

const MS_PER_MIN = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const ZOOM_OUT_LADDER_MS: number[] = [
	15 * MS_PER_MIN, // 15m
	45 * MS_PER_MIN, // 45m
	2 * MS_PER_HOUR, // 2hr
	7 * MS_PER_HOUR, // 7hr
	21 * MS_PER_HOUR, // 21hr
	1 * MS_PER_DAY, // 1d
	2 * MS_PER_DAY, // 2d
	3 * MS_PER_DAY, // 3d
	1 * MS_PER_WEEK, // 1w
	2 * MS_PER_WEEK, // 2w
	30 * MS_PER_DAY, // 1m
];

const LADDER_LAST_INDEX = ZOOM_OUT_LADDER_MS.length - 1;
const MAX_DURATION = ZOOM_OUT_LADDER_MS[LADDER_LAST_INDEX];
const MIN_LADDER_DURATION_MS = ZOOM_OUT_LADDER_MS[0]; // 15m - below this we use 3x

export const MAX_ZOOM_OUT_DURATION_MS = MAX_DURATION;

/** Returns true when zoom out should be disabled (range at or beyond 1 month) */
export function isZoomOutDisabled(durationMs: number): boolean {
	return durationMs >= MAX_ZOOM_OUT_DURATION_MS;
}

/** Preset labels for ladder steps supported by GetMinMax (shows "Last 15 minutes" etc. instead of "Custom") */
const PRESET_FOR_DURATION_MS: Record<number, Time | CustomTimeType> = {
	[15 * MS_PER_MIN]: '15m',
	[45 * MS_PER_MIN]: '45m',
	[2 * MS_PER_HOUR]: '2h',
	[7 * MS_PER_HOUR]: '7h',
	[21 * MS_PER_HOUR]: '21h',
	[1 * MS_PER_DAY]: '1d',
	[2 * MS_PER_DAY]: '2d',
	[3 * MS_PER_DAY]: '3d',
	[1 * MS_PER_WEEK]: '1w',
	[2 * MS_PER_WEEK]: '2w',
	[30 * MS_PER_DAY]: '1month',
};

/**
 * Returns the next duration in the zoom-out ladder for the given current duration.
 * Below 15m: zoom out 3x until we reach 15m, then continue with the ladder.
 * If at or past 1 month, returns MAX_DURATION (no zoom out - button is disabled).
 */
export function getNextDurationInLadder(durationMs: number): number {
	if (durationMs >= MAX_DURATION) {
		return MAX_DURATION; // No zoom out beyond 1 month
	}

	// Below 15m: zoom out 3x until we reach 15m
	if (durationMs < MIN_LADDER_DURATION_MS) {
		const next = durationMs * 3;
		return Math.min(next, MIN_LADDER_DURATION_MS);
	}

	// At or above 15m: use the fixed ladder
	for (let i = 0; i < ZOOM_OUT_LADDER_MS.length; i++) {
		if (ZOOM_OUT_LADDER_MS[i] > durationMs) {
			return ZOOM_OUT_LADDER_MS[i];
		}
	}

	return MAX_DURATION;
}

export interface ZoomOutResult {
	range: [number, number];
	/** Preset key (e.g. '15m') when range matches a preset - use for display instead of "Custom Date Range" */
	preset: Time | CustomTimeType | null;
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

	// No zoom out when already at max (1 month)
	if (newDurationMs <= durationMs) {
		return null;
	}
	const centerMs = startMs + durationMs / 2;
	const computedEndMs = centerMs + newDurationMs / 2;

	let newStartMs: number;
	let newEndMs: number;

	const isPhase1 = computedEndMs <= nowMs;
	if (isPhase1) {
		// Phase 1: center-anchored (historical range not ending at now)
		newStartMs = centerMs - newDurationMs / 2;
		newEndMs = computedEndMs;
	} else {
		// Phase 2: end-anchored at now
		newStartMs = nowMs - newDurationMs;
		newEndMs = nowMs;
	}

	// Phase 2 only: use preset so GetMinMax produces "last X from now".
	// Phase 1: preset=null so the center-anchored range is preserved (GetMinMax would discard it).
	const preset = isPhase1 ? null : PRESET_FOR_DURATION_MS[newDurationMs] ?? null;

	return {
		range: [Math.round(newStartMs), Math.round(newEndMs)],
		preset,
	};
}
