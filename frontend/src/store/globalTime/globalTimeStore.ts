import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import { create } from 'zustand';

import {
	IGlobalTimeStoreActions,
	IGlobalTimeStoreState,
	ParsedTimeRange,
} from './types';
import { isCustomTimeRange, parseSelectedTime } from './utils';

export type IGlobalTimeStore = IGlobalTimeStoreState & IGlobalTimeStoreActions;

export const useGlobalTimeStore = create<IGlobalTimeStore>((set, get) => ({
	selectedTime: DEFAULT_TIME_RANGE,
	isRefreshEnabled: false,
	refreshInterval: 0,
	setSelectedTime: (selectedTime, refreshInterval): void => {
		set((state) => {
			const newRefreshInterval = refreshInterval ?? state.refreshInterval;
			const isCustom = isCustomTimeRange(selectedTime);

			return {
				selectedTime,
				refreshInterval: newRefreshInterval,
				isRefreshEnabled: !isCustom && newRefreshInterval > 0,
			};
		});
	},
	getMinMaxTime: (selectedTime): ParsedTimeRange => {
		return parseSelectedTime(selectedTime || get().selectedTime);
	},
}));
