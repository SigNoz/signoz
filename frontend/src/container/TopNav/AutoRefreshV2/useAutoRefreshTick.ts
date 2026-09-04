// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { useInterval } from 'react-use';
import { getMinMaxForSelectedTime } from 'lib/getMinMax';
// eslint-disable-next-line no-restricted-imports
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

/**
 * Advances the global time window on the auto-refresh interval. The global
 * "auto refresh disabled" flag and a custom range override the caller's `enabled`.
 */
export function useAutoRefreshTick(enabled: boolean, intervalMs: number): void {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const isTicking =
		enabled &&
		intervalMs > 0 &&
		!globalTime.isAutoRefreshDisabled &&
		globalTime.selectedTime !== 'custom';

	useInterval(
		() => {
			const { maxTime, minTime } = getMinMaxForSelectedTime(
				globalTime.selectedTime,
				globalTime.minTime,
				globalTime.maxTime,
			);

			dispatch({
				type: UPDATE_TIME_INTERVAL,
				payload: {
					maxTime,
					minTime,
					selectedTime: globalTime.selectedTime,
				},
			});
		},
		isTicking ? intervalMs : null,
	);
}
