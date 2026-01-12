import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';

import { roundHalfUp } from './round';

dayjs.extend(duration);

type EpochInput = number;

interface NormalizedRange {
	startEpochSeconds: number;
	endEpochSeconds: number;
	startTime: Dayjs;
	endTime: Dayjs;
}

interface ValidationResult {
	isValid: boolean;
	error?: string | null;
	range?: NormalizedRange | null;
}

/**
 * Detects whether an epoch value is in milliseconds or seconds
 * and normalizes it to epoch seconds.
 */
function normalizeToSeconds(epoch: EpochInput): number {
	if (!Number.isFinite(epoch)) {
		throw new Error('Epoch value must be a finite number');
	}

	// Heuristic:
	// Seconds ≈ 1e9–1e10 (2001–2286)
	// Milliseconds ≈ 1e12–1e13
	return epoch > 1e11
		? Math.floor(epoch / 1000) // milliseconds → seconds
		: Math.floor(epoch); // already seconds
}

export function validateEpochRange(
	startInput: EpochInput,
	endInput: EpochInput,
): ValidationResult {
	let startSeconds: number;
	let endSeconds: number;

	try {
		startSeconds = normalizeToSeconds(startInput);
		endSeconds = normalizeToSeconds(endInput);
	} catch (e) {
		return { isValid: false, error: (e as Error).message };
	}

	const startTime = dayjs.unix(startSeconds);
	const endTime = dayjs.unix(endSeconds);

	if (!startTime.isValid()) {
		return { isValid: false, error: 'Invalid startTime epoch', range: null };
	}

	if (!endTime.isValid()) {
		return { isValid: false, error: 'Invalid endTime epoch', range: null };
	}

	if (!endTime.isAfter(startTime)) {
		return {
			isValid: false,
			error: 'endTime must be after startTime',
			range: null,
		};
	}

	return {
		isValid: true,
		error: null,
		range: {
			startEpochSeconds: startSeconds,
			endEpochSeconds: endSeconds,
			startTime,
			endTime,
		},
	};
}

/**
 * Returns the time difference between two epoch timestamps
 * in a human-readable format: `X m`, `X h`, `X d`, or `X w`.
 *
 * Rounding behavior:
 * - Uses half-up rounding (≥ 0.5 rounds up).
 *
 * Unit selection:
 * - Chooses the largest applicable unit (weeks → days → hours → minutes).
 * - `X` is always a whole number.
 *
 * Assumptions:
 * - `minTime` and `maxTime` are epoch timestamps in **milliseconds**.
 *
 * @param minTime - Start time as epoch milliseconds
 * @param maxTime - End time as epoch milliseconds
 * @returns A formatted duration string or an empty string for invalid ranges
 */
export const getTimeDifference = (minTime: number, maxTime: number): string => {
	if (!minTime || !maxTime || maxTime <= minTime) {
		return '';
	}

	// Difference is already in milliseconds
	const diffInMs = maxTime - minTime;
	const diff = dayjs.duration(diffInMs, 'milliseconds');

	const weeks = diff.asWeeks();
	if (weeks >= 1) return `${roundHalfUp(weeks)}w`;

	const days = diff.asDays();
	if (days >= 1) return `${roundHalfUp(days)}d`;

	const hours = diff.asHours();
	if (hours >= 1) return `${roundHalfUp(hours)}h`;

	return `${roundHalfUp(diff.asMinutes())}m`;
};
