import { QueryParams } from 'constants/query';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';
import type { GlobalReducer } from 'types/reducer/globalTime';

type GlobalTimeSelection = Pick<
	GlobalReducer,
	'selectedTime' | 'minTime' | 'maxTime'
>;

/**
 * Time-window URL params for the active selection. Derived from Redux (what the picker and
 * panel queries read), not the URL: the legacy react-router and newer nuqs time writers fall
 * out of sync, leaving a stale `relativeTime` that `DateTimeSelectionV2` prefers over an
 * absolute range. Redux keeps them mutually exclusive (custom → start/end ms; else relativeTime).
 */
export function timeParamsFromGlobalTime({
	selectedTime,
	minTime,
	maxTime,
}: GlobalTimeSelection): URLSearchParams {
	const params = new URLSearchParams();

	if (selectedTime === 'custom') {
		if (minTime > 0 && maxTime > 0) {
			params.set(
				QueryParams.startTime,
				String(Math.floor(minTime / NANO_SECOND_MULTIPLIER)),
			);
			params.set(
				QueryParams.endTime,
				String(Math.floor(maxTime / NANO_SECOND_MULTIPLIER)),
			);
		}
	} else {
		params.set(QueryParams.relativeTime, selectedTime);
	}

	return params;
}
