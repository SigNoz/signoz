import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import GetMinMax from 'lib/getMinMax';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';

export const UpdateTimeInterval = (
	interval: Time | TimeV2 | CustomTimeType,
	dateTimeRange: [number, number] = [0, 0],
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	const { maxTime, minTime } = GetMinMax(interval, dateTimeRange);

	dispatch({
		type: UPDATE_TIME_INTERVAL,
		payload: {
			maxTime,
			minTime,
			selectedTime: interval,
		},
	});
};

export const GlobalTimeLoading = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => (dispatch: Dispatch<AppActions>): void => {
	dispatch({
		type: 'GLOBAL_TIME_LOADING_START',
	});
};
