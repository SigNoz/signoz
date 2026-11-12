import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

function readPersistedTimes(): Record<string, string> {
	const stored = getLocalStorageKey(LOCALSTORAGE.METRICS_TIME_IN_DURATION);
	try {
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

export function hasPersistedTimeForRoute(pathname: string): boolean {
	return Boolean(readPersistedTimes()[pathname]);
}

/**
 * Updates the stored time duration for a route in localStorage.
 * Used by both DateTimeSelectionV2 (manual time pick) and useZoomOut (zoom out button).
 *
 * @param pathname - The route path (e.g. /infrastructure-monitoring/hosts)
 * @param value - The time value to store (preset string like '1w' or JSON string for custom range)
 */
export function persistTimeDurationForRoute(
	pathname: string,
	value: string,
): void {
	const preRoute = { ...readPersistedTimes(), [pathname]: value };
	setLocalStorageKey(
		LOCALSTORAGE.METRICS_TIME_IN_DURATION,
		JSON.stringify(preRoute),
	);
}
