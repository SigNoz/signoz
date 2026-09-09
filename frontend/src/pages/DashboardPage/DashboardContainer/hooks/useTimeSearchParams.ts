import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- global time still lives in redux
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

import { timeParamsFromGlobalTime } from '../utils/timeUrlParams';

/** Active time window as a query string (no leading `?`), or `''` when unset. */
export function useTimeSearchParams(): string {
	const { selectedTime, minTime, maxTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	return useMemo(
		() => timeParamsFromGlobalTime({ selectedTime, minTime, maxTime }).toString(),
		[selectedTime, minTime, maxTime],
	);
}
