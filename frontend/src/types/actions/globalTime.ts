import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';

import { ResetIdStartAndEnd, SetSearchQueryString } from './logs';

export const UPDATE_TIME_INTERVAL = 'UPDATE_TIME_INTERVAL';
export const GLOBAL_TIME_LOADING_START = 'GLOBAL_TIME_LOADING_START';
export const UPDATE_AUTO_REFRESH_DISABLED = 'UPDATE_AUTO_REFRESH_DISABLED';
export const UPDATE_AUTO_REFRESH_INTERVAL = 'UPDATE_AUTO_REFRESH_INTERVAL';

export type GlobalTime = {
	maxTime: number;
	minTime: number;
};

interface UpdateTime extends GlobalTime {
	selectedTime: Time | TimeV2 | CustomTimeType;
}

interface UpdateTimeInterval {
	type: typeof UPDATE_TIME_INTERVAL;
	payload: UpdateTime;
}

interface UpdateAutoRefreshDisabled {
	type: typeof UPDATE_AUTO_REFRESH_DISABLED;
	payload: boolean;
}

interface GlobalTimeLoading {
	type: typeof GLOBAL_TIME_LOADING_START;
}

interface UpdateAutoRefreshInterval {
	type: typeof UPDATE_AUTO_REFRESH_INTERVAL;
	payload: string;
}

export type GlobalTimeAction =
	| UpdateTimeInterval
	| GlobalTimeLoading
	| UpdateAutoRefreshDisabled
	| UpdateAutoRefreshInterval
	| ResetIdStartAndEnd
	| SetSearchQueryString;
