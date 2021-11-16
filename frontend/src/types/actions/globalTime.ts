import { Time } from 'container/Header/DateTimeSelection/config';

export const UPDATE_TIME_INTERVAL = 'UPDATE_TIME_INTERVAL';
export const GLOBAL_TIME_LOADING_START = 'GLOBAL_TIME_LOADING_START';

export type GlobalTime = {
	maxTime: number;
	minTime: number;
};

interface UpdateTime extends GlobalTime {
	selectedTime: Time;
}

interface UpdateTimeInterval {
	type: typeof UPDATE_TIME_INTERVAL;
	payload: UpdateTime;
}

interface GlobalTimeLoading {
	type: typeof GLOBAL_TIME_LOADING_START;
}

export type GlobalTimeAction = UpdateTimeInterval | GlobalTimeLoading;
