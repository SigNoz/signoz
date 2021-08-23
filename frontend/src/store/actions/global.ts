import { ActionTypes } from './types';
import { Moment } from 'moment';

export type DateTimeRangeType = [Moment | null, Moment | null] | null;

export interface GlobalTime {
	maxTime: number;
	minTime: number;
}

export interface updateTimeIntervalAction {
	type: ActionTypes.updateTimeInterval;
	payload: GlobalTime;
}

export const updateTimeInterval = (
	interval: string,
	datetimeRange?: [number, number],
) => {
	let maxTime = 0;
	let minTime = 0;
	// if interval string is custom, then datetimRange should be present and max & min time should be
	// set directly based on that. Assuming datetimeRange values are in ms, and minTime is 0th element

	switch (interval) {
	case '1min':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 1 * 60 * 1000) * 1000000;
		break;
	case '5min':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 5 * 60 * 1000) * 1000000;
		break;

	case '15min':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 15 * 60 * 1000) * 1000000;
		break;

	case '30min':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 30 * 60 * 1000) * 1000000;
		break;

	case '1hr':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 1 * 60 * 60 * 1000) * 1000000;
		break;

	case '6hr':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 6 * 60 * 60 * 1000) * 1000000;
		break;

	case '1day':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 24 * 60 * 60 * 1000) * 1000000;
		break;

	case '1week':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 7 * 24 * 60 * 60 * 1000) * 1000000;
		break;

	case 'custom':
		if (datetimeRange !== undefined) {
			maxTime = datetimeRange[1] * 1000000; // in nano sec
			minTime = datetimeRange[0] * 1000000; // in nano sec
		}
		break;

	default:
		console.log('not found matching case');
	}

	return {
		type: ActionTypes.updateTimeInterval,
		payload: { maxTime: maxTime, minTime: minTime },
	};
};
