import { useEffect } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { refreshIntervalOptions } from 'container/TopNav/AutoRefreshV2/constants';
import { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { useGlobalTimeStore } from 'store/globalTime/globalTimeStore';
import { createCustomTimeRange } from 'store/globalTime/utils';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

/**
 * Adapter component that syncs Redux global time state to Zustand store.
 * This component should be rendered once at the app level.
 *
 * It reads from the Redux globalTime reducer and updates the Zustand store
 * to provide a migration path from Redux to Zustand.
 */
export function GlobalTimeStoreAdapter(): null {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const setSelectedTime = useGlobalTimeStore((s) => s.setSelectedTime);

	useEffect(() => {
		// Convert the selectedTime to the new format
		// If it's 'custom', store the min/max times in the custom format
		const selectedTime =
			globalTime.selectedTime === 'custom'
				? createCustomTimeRange(globalTime.minTime, globalTime.maxTime)
				: (globalTime.selectedTime as Time);

		// Find refresh interval from Redux state
		const refreshOption = refreshIntervalOptions.find(
			(option) => option.key === globalTime.selectedAutoRefreshInterval,
		);

		const refreshInterval =
			!globalTime.isAutoRefreshDisabled && refreshOption ? refreshOption.value : 0;

		setSelectedTime(selectedTime, refreshInterval);
	}, [
		globalTime.selectedTime,
		globalTime.isAutoRefreshDisabled,
		globalTime.selectedAutoRefreshInterval,
		globalTime.minTime,
		globalTime.maxTime,
		setSelectedTime,
	]);

	return null;
}
