import { Time } from 'container/Header/DateTimeSelection/config';
import { GlobalReducer } from 'types/reducer/globalTime';

export const UPDATE_TIME_INTERVAL = 'UPDATE_TIME_INTERVAL';
export const GLOBAL_TIME_LOADING_START = 'GLOBAL_TIME_LOADING_START';

interface UpdateTimeInterval {
	type: typeof UPDATE_TIME_INTERVAL;
	payload: {
		selectedTime: Time;
		maxTime: GlobalReducer['maxTime'];
		minTime: GlobalReducer['minTime'];
	};
}

interface GlobalTimeLoading {
	type: typeof GLOBAL_TIME_LOADING_START;
}

export type GlobalTimeAction = UpdateTimeInterval | GlobalTimeLoading;
