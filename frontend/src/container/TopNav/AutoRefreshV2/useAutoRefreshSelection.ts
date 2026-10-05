import { useLocation } from 'react-router-dom';
import get from 'api/browser/localstorage/get';
import { DASHBOARD_TIME_IN_DURATION } from 'constants/app';

import { refreshIntervalOptions } from './constants';

export interface AutoRefreshSelection {
	isEnabled: boolean;
	intervalMs: number;
}

/**
 * An entry for the current route means auto-refresh is on, its absence means off.
 * Read on every render because localStorage isn't reactive.
 */
export function useAutoRefreshSelection(): AutoRefreshSelection {
	const { pathname } = useLocation();

	const selectedOption = JSON.parse(get(DASHBOARD_TIME_IN_DURATION) || '{}')[
		pathname
	];

	return {
		isEnabled: Boolean(selectedOption),
		intervalMs:
			refreshIntervalOptions.find((option) => option.key === selectedOption)
				?.value || 0,
	};
}
