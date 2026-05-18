// oxlint-disable-next-line no-restricted-imports
import { useContext } from 'react';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import { GlobalTimeContext } from './GlobalTimeContext';
import { defaultGlobalTimeStore, GlobalTimeStoreApi } from './globalTimeStore';
import { GlobalTimeStore, ParsedTimeRange } from './types';
import { isCustomTimeRange } from './utils';

/**
 * Access global time state with optional selector for performance.
 *
 * @example
 * // Full state (re-renders on any change)
 * const { selectedTime, setSelectedTime } = useGlobalTime();
 *
 * @example
 * // With selector (re-renders only when selectedTime changes)
 * const selectedTime = useGlobalTime(state => state.selectedTime);
 */
export function useGlobalTime<T = GlobalTimeStore>(
	selector?: (state: GlobalTimeStore) => T,
	equalityFn?: (a: T, b: T) => boolean,
): T {
	const contextStore = useContext(GlobalTimeContext);
	const store = contextStore ?? defaultGlobalTimeStore;

	return useStoreWithEqualityFn(
		store,
		selector ?? ((state) => state as unknown as T),
		equalityFn,
	);
}

/**
 * Check if currently using a custom time range.
 */
export function useIsCustomTimeRange(): boolean {
	const selectedTime = useGlobalTime((state) => state.selectedTime);
	return isCustomTimeRange(selectedTime);
}

/**
 * Get the store API directly (for subscriptions or non-React contexts).
 */
export function useGlobalTimeStoreApi(): GlobalTimeStoreApi {
	const contextStore = useContext(GlobalTimeContext);
	return contextStore ?? defaultGlobalTimeStore;
}

/**
 * Get the last computed min/max time values.
 * Use this for display purposes to ensure consistency with query data.
 */
export function useLastComputedMinMax(): ParsedTimeRange {
	return useGlobalTime((state) => state.lastComputedMinMax);
}
