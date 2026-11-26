import {
	PROMETHEUS_DURATION_UNIT_MS,
	prometheusDurationToMs,
} from 'utils/prometheusDuration';

const MINUTE_MS = PROMETHEUS_DURATION_UNIT_MS.m;
const PICKER_UNITS: { unit: string; minutes: number }[] = [
	{ unit: 'w', minutes: 10_080 },
	{ unit: 'd', minutes: 1_440 },
	{ unit: 'h', minutes: 60 },
];

/**
 * The time picker's relative time for a dashboard duration, or null when the
 * duration is empty, zero or not a duration. The picker has no seconds, so the
 * window is rounded up to whole minutes: `1h30m` opens as `90m`, `15s` as `1m`.
 */
export function toPickerRelativeTime(
	duration: string | undefined,
): string | null {
	const totalMs = duration ? prometheusDurationToMs(duration) : null;
	if (!totalMs) {
		return null;
	}
	const minutes = Math.ceil(totalMs / MINUTE_MS);
	const largest = PICKER_UNITS.find((option) => minutes % option.minutes === 0);
	return largest ? `${minutes / largest.minutes}${largest.unit}` : `${minutes}m`;
}

/** Why a hand-written `spec.duration` can't be saved, or null when it can. */
export function dashboardDurationError(duration: unknown): string | null {
	if (duration === undefined || duration === null || duration === '') {
		return null;
	}
	const totalMs =
		typeof duration === 'string' ? prometheusDurationToMs(duration) : null;
	if (!totalMs || totalMs % MINUTE_MS !== 0) {
		return '"spec.duration" must be a whole number of minutes above zero, like 30m, 6h or 1d. The time picker has no seconds.';
	}
	return null;
}
