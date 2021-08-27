import { Moment } from 'moment';

import { ActionTypes } from "./types";

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
<<<<<<< HEAD
	case "1min":
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 1 * 60 * 1000) * 1000000;
		break;
	case "5min":
=======
	case '1min':
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 1 * 60 * 1000) * 1000000;
		break;
	case '5min':
>>>>>>> main
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 5 * 60 * 1000) * 1000000;
		break;

<<<<<<< HEAD
	case "15min":
=======
	case '15min':
>>>>>>> main
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 15 * 60 * 1000) * 1000000;
		break;

<<<<<<< HEAD
	case "30min":
=======
	case '30min':
>>>>>>> main
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 30 * 60 * 1000) * 1000000;
		break;

<<<<<<< HEAD
	case "1hr":
=======
	case '1hr':
>>>>>>> main
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 1 * 60 * 60 * 1000) * 1000000;
		break;

<<<<<<< HEAD
	case "6hr":
=======
	case '6hr':
>>>>>>> main
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 6 * 60 * 60 * 1000) * 1000000;
		break;

<<<<<<< HEAD
	case "1day":
=======
	case '1day':
>>>>>>> main
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 24 * 60 * 60 * 1000) * 1000000;
		break;

<<<<<<< HEAD
	case "1week":
=======
	case '1week':
>>>>>>> main
		maxTime = Date.now() * 1000000; // in nano sec
		minTime = (Date.now() - 7 * 24 * 60 * 60 * 1000) * 1000000;
		break;

<<<<<<< HEAD
	case "custom":
=======
	case 'custom':
>>>>>>> main
		if (datetimeRange !== undefined) {
			maxTime = datetimeRange[1] * 1000000; // in nano sec
			minTime = datetimeRange[0] * 1000000; // in nano sec
		}
		break;

	default:
<<<<<<< HEAD
		console.log("not found matching case");
=======
		console.log('not found matching case');
>>>>>>> main
	}

	return {
		type: ActionTypes.updateTimeInterval,
		payload: { maxTime: maxTime, minTime: minTime },
	};
};
