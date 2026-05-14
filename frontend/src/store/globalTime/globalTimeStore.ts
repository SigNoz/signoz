import { createStore, StoreApi, useStore } from 'zustand';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';

import {
	GlobalTimeSelectedTime,
	GlobalTimeState,
	GlobalTimeStore,
	ParsedTimeRange,
} from './types';
import {
	computeRounded5sMinMax,
	isCustomTimeRange,
	parseSelectedTime,
	safeParseSelectedTime,
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
	const name = initialState?.name;

	return createStore<GlobalTimeStore>((set, get) => ({
		name,
		selectedTime,
		refreshInterval,
		isRefreshEnabled: computeIsRefreshEnabled(selectedTime, refreshInterval),
		lastRefreshTimestamp: 0,
		lastComputedMinMax: safeParseSelectedTime(selectedTime),

		setSelectedTime: (
			time: GlobalTimeSelectedTime,
			newRefreshInterval?: number,
		): void => {
			const state = get();
			const interval = newRefreshInterval ?? state.refreshInterval;

			if (time === state.selectedTime && interval === state.refreshInterval) {
				return;
			}

			const computedMinMax = parseSelectedTime(time);

			set({
				selectedTime: time,
				refreshInterval: interval,
				isRefreshEnabled: computeIsRefreshEnabled(time, interval),
				lastComputedMinMax: computedMinMax,
				lastRefreshTimestamp: Date.now(),
			});
		},

		setRefreshInterval: (interval: number): void => {
			set((state) => ({
				refreshInterval: interval,
				isRefreshEnabled: computeIsRefreshEnabled(state.selectedTime, interval),
			}));
		},

		getMinMaxTime: (): ParsedTimeRange => {
			const state = get();

			if (isCustomTimeRange(state.selectedTime)) {
				return parseSelectedTime(state.selectedTime);
			}

			if (state.isRefreshEnabled) {
				const freshMinMax = computeRounded5sMinMax(state.selectedTime);

				if (
					freshMinMax.minTime !== state.lastComputedMinMax.minTime ||
					freshMinMax.maxTime !== state.lastComputedMinMax.maxTime
				) {
					set({ lastComputedMinMax: freshMinMax, lastRefreshTimestamp: Date.now() });
				}

				return freshMinMax;
			}

			return state.lastComputedMinMax;
		},

		computeAndStoreMinMax: (): ParsedTimeRange => {
			const state = get();

			if (state.isRefreshEnabled) {
				return state.lastComputedMinMax;
			}

			const computedMinMax = parseSelectedTime(state.selectedTime);

			set({
				lastComputedMinMax: computedMinMax,
				lastRefreshTimestamp: Date.now(),
			});
			return computedMinMax;
		},

		updateRefreshTimestamp: (): void => {
			set({ lastRefreshTimestamp: Date.now() });
		},

		getAutoRefreshQueryKey: (
			selectedTime: GlobalTimeSelectedTime,
			...queryParts: unknown[]
		): unknown[] => {
			const storeName = get().name;
			if (storeName) {
				return [
					REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
					storeName,
					...queryParts,
					selectedTime,
				];
			}
			return [REACT_QUERY_KEY.AUTO_REFRESH_QUERY, ...queryParts, selectedTime];
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
