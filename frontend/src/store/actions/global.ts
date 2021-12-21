import { Time } from 'container/Header/DateTimeSelection/config';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const UpdateTimeInterval = (
	interval: Time,
	isCalculated: boolean,
	dateTimeRange: [number, number] = [0, 0],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		const { maxTime, minTime } = GetMinMax(interval, dateTimeRange);

		if (isCalculated) {
			dispatch({
				type: 'UPDATE_TIME_INTERVAL',
				payload: {
					maxTime: maxTime,
					minTime: minTime,
					selectedTime: interval,
				},
			});
		} else {
			dispatch({
				type: 'UPDATE_TIME_INTERVAL',
				payload: {
					selectedTime: interval,
					maxTime: dateTimeRange[0] * 1000000,
					minTime: dateTimeRange[1] * 1000000,
				},
			});
		}
	};
};

export const GlobalTimeLoading = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'GLOBAL_TIME_LOADING_START',
		});
	};
};
