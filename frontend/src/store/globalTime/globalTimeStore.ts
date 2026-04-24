import { createStore, StoreApi, useStore } from 'zustand';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';

import {
	GlobalTimeSelectedTime,
	GlobalTimeState,
	GlobalTimeStore,
	ParsedTimeRange,
} from './types';
import {
	computeRoundedMinMax,
	isCustomTimeRange,
	parseSelectedTime,
} from './utils';

export type GlobalTimeStoreApi = StoreApi<GlobalTimeStore>;
export type IGlobalTimeStore = GlobalTimeStore;

function computeIsRefreshEnabled(
	selectedTime: GlobalTimeSelectedTime,
	refreshInterval: number,
): boolean {
	if (isCustomTimeRange(selectedTime)) {
		return false;
	}
	return refreshInterval > 0;
}

export function createGlobalTimeStore(
	initialState?: Partial<GlobalTimeState>,
): GlobalTimeStoreApi {
	const selectedTime = initialState?.selectedTime ?? DEFAULT_TIME_RANGE;
	const refreshInterval = initialState?.refreshInterval ?? 0;

	return createStore<GlobalTimeStore>((set, get) => ({
		selectedTime,
		refreshInterval,
		isRefreshEnabled: computeIsRefreshEnabled(selectedTime, refreshInterval),
		lastRefreshTimestamp: 0,
		lastComputedMinMax: { minTime: 0, maxTime: 0 },

		setSelectedTime: (
			time: GlobalTimeSelectedTime,
			newRefreshInterval?: number,
		): void => {
			set((state) => {
				const interval = newRefreshInterval ?? state.refreshInterval;
				return {
					selectedTime: time,
					refreshInterval: interval,
					isRefreshEnabled: computeIsRefreshEnabled(time, interval),
					// Reset cached values so getMinMaxTime computes fresh values for the new selection
					lastComputedMinMax: { minTime: 0, maxTime: 0 },
				};
			});
		},

		setRefreshInterval: (interval: number): void => {
			set((state) => ({
				refreshInterval: interval,
				isRefreshEnabled: computeIsRefreshEnabled(state.selectedTime, interval),
			}));
		},

		getMinMaxTime: (selectedTime?: GlobalTimeSelectedTime): ParsedTimeRange => {
			const state = get();
			const timeToUse = selectedTime ?? state.selectedTime;

			// For custom time ranges, return exact values without rounding
			if (isCustomTimeRange(timeToUse)) {
				return parseSelectedTime(timeToUse);
			}

			if (selectedTime && selectedTime !== state.selectedTime) {
				return computeRoundedMinMax(selectedTime);
			}

			// When auto-refresh is enabled, compute fresh values and update store
			// This ensures time moves forward on each refetchInterval cycle
			// Note: computeRoundedMinMax rounds to minute boundaries, so all queries
			// calling getMinMaxTime within the same minute get consistent values
			if (state.isRefreshEnabled) {
				const freshMinMax = computeRoundedMinMax(state.selectedTime);

				// Only update store if values changed (avoids unnecessary re-renders)
				if (
					freshMinMax.minTime !== state.lastComputedMinMax.minTime ||
					freshMinMax.maxTime !== state.lastComputedMinMax.maxTime
				) {
					set({
						lastComputedMinMax: freshMinMax,
						lastRefreshTimestamp: Date.now(),
					});
				}

				return freshMinMax;
			}

			// Return stored values if they exist (set by computeAndStoreMinMax)
			// This ensures all callers get the same values within a refresh cycle
			if (state.lastComputedMinMax.maxTime > 0) {
				return state.lastComputedMinMax;
			}

			return computeRoundedMinMax(state.selectedTime);
		},

		computeAndStoreMinMax: (): ParsedTimeRange => {
			const { selectedTime } = get();
			// For custom time ranges, use exact values without rounding
			const computedMinMax = isCustomTimeRange(selectedTime)
				? parseSelectedTime(selectedTime)
				: computeRoundedMinMax(selectedTime);

			set({
				lastComputedMinMax: computedMinMax,
				lastRefreshTimestamp: Date.now(),
			});

			return computedMinMax;
		},

		updateRefreshTimestamp: (): void => {
			set({ lastRefreshTimestamp: Date.now() });
		},
	}));
}

export const defaultGlobalTimeStore = createGlobalTimeStore();

export const useGlobalTimeStore = <T = GlobalTimeStore>(
	selector?: (state: GlobalTimeStore) => T,
): T => {
	return useStore(
		defaultGlobalTimeStore,
		selector ?? ((state) => state as unknown as T),
	);
};
