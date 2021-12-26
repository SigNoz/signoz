import { Time } from 'container/Header/DateTimeSelection/config';
import GetMinMax from 'lib/getGlobalMinMax';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const UpdateTimeInterval = (
	interval: Time,
	customSelectedStartEndTime: [number, number] = [0, 0],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		const { maxTime, minTime } = GetMinMax(interval, customSelectedStartEndTime);

		dispatch({
			type: 'UPDATE_TIME_INTERVAL',
			payload: {
				maxTime: maxTime,
				minTime: minTime,
				selectedTime: interval,
			},
		});
	};
};
